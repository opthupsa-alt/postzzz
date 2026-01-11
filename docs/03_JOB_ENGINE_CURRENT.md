# 03_JOB_ENGINE_CURRENT.md - محرك المهام

> **Generated**: 2026-01-12  
> **Source**: `api/src/jobs/`, `api/src/agent/`  
> **Purpose**: Phase 0 - فهم المشروع من الكود

---

## 1. Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JOB ENGINE FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────────┐  │
│  │  Web    │───►│  API    │───►│   DB    │    │   Extension     │  │
│  │ Create  │    │ /jobs   │    │  Job    │    │   (Agent)       │  │
│  └─────────┘    └────┬────┘    └────┬────┘    └────────┬────────┘  │
│                      │              │                   │           │
│                      │    ┌─────────▼─────────┐        │           │
│                      └───►│   AgentGateway    │◄───────┘           │
│                           │   (WebSocket)     │                    │
│                           └───────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Job Model

**Path**: `api/prisma/schema.prisma:104-130`

```prisma
model Job {
  id              String     @id @default(uuid())
  tenantId        String
  type            String     // Job type
  status          JobStatus  @default(PENDING)
  progress        Int        @default(0)
  errorCode       String?
  needsUserAction Boolean    @default(false)
  input           Json?      // Job parameters
  output          Json?      // Job results
  createdAt       DateTime   @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  createdById     String
  assignedAgentId String?    // Extension agent ID
  evidence        Evidence[]
  jobLogs         JobLog[]
  leads           Lead[]
}
```

### Job Statuses
**Path**: `api/prisma/schema.prisma:200-206`

| Status | Description |
|--------|-------------|
| `PENDING` | Created, waiting for agent |
| `RUNNING` | Agent executing |
| `COMPLETED` | Successfully finished |
| `FAILED` | Error occurred |
| `CANCELLED` | User cancelled |

---

## 3. Jobs Service

**Path**: `api/src/jobs/jobs.service.ts`

### Class Definition
```typescript
@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject(forwardRef(() => AgentGateway))
    private agentGateway: AgentGateway,
  ) {}
}
```

### Key Methods

#### create()
**Path**: `api/src/jobs/jobs.service.ts:28-58`

```typescript
async create(tenantId: string, userId: string, dto: CreateJobDto) {
  const job = await this.prisma.job.create({
    data: {
      tenantId,
      createdById: userId,
      type: dto.type,
      status: 'PENDING',
      progress: 0,
      input: dto.input || {},
    },
  });

  // Audit log
  await this.auditService.log({ ... });

  // Broadcast to connected agents
  this.agentGateway.broadcastNewJob({
    jobId: job.id,
    type: job.type,
    context: dto.input,
    tenantId,
  });

  return job;
}
```

#### findById()
**Path**: `api/src/jobs/jobs.service.ts:60-78`

```typescript
async findById(jobId: string, tenantId: string) {
  const job = await this.prisma.job.findFirst({
    where: { id: jobId, tenantId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { evidence: true, jobLogs: true } },
    },
  });
  // ...
}
```

#### cancel()
**Path**: `api/src/jobs/jobs.service.ts:96-120`

```typescript
async cancel(jobId: string, tenantId: string, userId: string) {
  // Update status to CANCELLED
  // Audit log
}
```

#### updateProgress()
**Path**: `api/src/jobs/jobs.service.ts` (~line 150)

```typescript
async updateProgress(jobId: string, progress: number, message?: string) {
  // Update progress percentage
  // Add job log
}
```

#### addEvidence()
**Path**: `api/src/jobs/jobs.service.ts` (~line 180)

```typescript
async addEvidence(jobId: string, evidence: any[]) {
  // Create evidence records
  // Deduplicate by hash
}
```

#### markCompleted()
**Path**: `api/src/jobs/jobs.service.ts` (~line 220)

```typescript
async markCompleted(jobId: string, output?: any) {
  // Update status to COMPLETED
  // Set completedAt
}
```

#### markFailed()
**Path**: `api/src/jobs/jobs.service.ts` (~line 250)

```typescript
async markFailed(jobId: string, error: any, errorCode?: string) {
  // Update status to FAILED
  // Store error details
}
```

---

## 4. Jobs Controller

**Path**: `api/src/jobs/jobs.controller.ts`

### Endpoints

| Method | Path | Function | Description |
|--------|------|----------|-------------|
| POST | `/jobs` | `create()` | Create new job |
| GET | `/jobs` | `findAll()` | List jobs for tenant |
| GET | `/jobs/:id` | `findOne()` | Get job details |
| POST | `/jobs/:id/cancel` | `cancel()` | Cancel job |
| GET | `/jobs/:id/logs` | `getLogs()` | Get job logs |
| GET | `/jobs/:id/evidence` | `getEvidence()` | Get job evidence |

---

## 5. Agent Gateway (WebSocket)

**Path**: `api/src/agent/agent.gateway.ts`

### Class Definition
```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/agent',
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedAgents: Map<string, Socket> = new Map();
}
```

### Connection Handling
**Path**: `api/src/agent/agent.gateway.ts:27-51`

```typescript
async handleConnection(client: Socket) {
  const agentId = client.handshake.headers['x-agent-id'] || `agent_${client.id}`;
  this.connectedAgents.set(agentId, client);
  
  // Send config on connect
  const config = await this.agentService.getConfig();
  client.emit('config', config);
}

handleDisconnect(client: Socket) {
  this.connectedAgents.delete(agentId);
}
```

### Message Handlers

#### heartbeat
**Path**: `api/src/agent/agent.gateway.ts:53-60`

```typescript
@SubscribeMessage('heartbeat')
async handleHeartbeat(@MessageBody() data: { agentId: string }) {
  const result = await this.agentService.heartbeat(data.agentId);
  return { event: 'heartbeat_ack', data: result };
}
```

#### job:ack
**Path**: `api/src/agent/agent.gateway.ts:62-73`

```typescript
@SubscribeMessage('job:ack')
async handleJobAck(@MessageBody() data: { jobId: string; agentId: string }) {
  const result = await this.agentService.ackJob(data.jobId, data.agentId);
  return { event: 'job:ack_success', data: result };
}
```

#### job:progress
**Path**: `api/src/agent/agent.gateway.ts:75-91`

```typescript
@SubscribeMessage('job:progress')
async handleJobProgress(@MessageBody() data: { 
  jobId: string; 
  agentId: string; 
  progress: number; 
  message?: string 
}) {
  const result = await this.agentService.updateProgress(...);
  return { event: 'job:progress_ack', data: result };
}
```

#### job:evidence
**Path**: `api/src/agent/agent.gateway.ts:93-108`

```typescript
@SubscribeMessage('job:evidence')
async handleJobEvidence(@MessageBody() data: { 
  jobId: string; 
  agentId: string; 
  evidence: any[] 
}) {
  const result = await this.agentService.submitEvidence(...);
  return { event: 'job:evidence_ack', data: result };
}
```

#### job:done
**Path**: `api/src/agent/agent.gateway.ts:110-121`

```typescript
@SubscribeMessage('job:done')
async handleJobDone(@MessageBody() data: { 
  jobId: string; 
  agentId: string; 
  output?: Record<string, unknown> 
}) {
  const result = await this.agentService.markDone(...);
  return { event: 'job:done_ack', data: result };
}
```

### Broadcasting
**Path**: `api/src/agent/agent.gateway.ts:131-141`

```typescript
broadcastNewJob(job: any) {
  console.log(`Broadcasting job to ${this.connectedAgents.size} agents`);
  this.server.emit('job:available', job);
}

pushJobToAgent(agentId: string, job: any) {
  const client = this.connectedAgents.get(agentId);
  if (client) {
    client.emit('job:new', job);
  }
}
```

---

## 6. Agent Service

**Path**: `api/src/agent/agent.service.ts`

### Key Methods

| Method | Purpose |
|--------|---------|
| `getConfig()` | Get platform config for extension |
| `heartbeat()` | Update agent last seen |
| `ackJob()` | Acknowledge job assignment |
| `updateProgress()` | Update job progress |
| `submitEvidence()` | Store search results |
| `markDone()` | Complete job |
| `markError()` | Fail job with error |

### getConfig()
**Path**: `api/src/agent/agent.service.ts:50-70`

```typescript
async getConfig() {
  const settings = await this.prisma.platformSettings.findFirst();
  return {
    platform: {
      platformUrl: settings?.platformUrl,
      apiUrl: settings?.apiUrl,
      searchMethod: settings?.searchMethod,
      // ...
    },
    connectors: [
      { id: 'google_maps', name: 'Google Maps', enabled: true },
      { id: 'google_search', name: 'Google Search', enabled: true },
    ],
  };
}
```

---

## 7. Job Types (Current)

| Type | Description | Used By |
|------|-------------|---------|
| `SEARCH_SINGLE` | Single search query | Prospecting page |
| `SEARCH_BULK` | Bulk search (multiple queries) | Prospecting page |
| `google_maps` | Google Maps search | Extension |
| `google_maps_search` | Google Maps + Search | Extension |

---

## 8. Evidence Model

**Path**: `api/prisma/schema.prisma:145-163`

```prisma
model Evidence {
  id          String   @id @default(uuid())
  jobId       String
  type        String   // Evidence type
  title       String   // Company name
  source      String   // Source (google_maps, etc.)
  url         String?  // Source URL
  snippet     String   // Data snippet (JSON)
  confidence  String   // high, medium, low
  hash        String   // Dedup hash
  sizeBytes   Int
  collectedAt DateTime
}
```

---

## 9. Job Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JOB LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CREATE                                                          │
│     POST /jobs { type, input }                                      │
│     → DB: status=PENDING                                            │
│     → WebSocket: emit('job:available')                              │
│                                                                     │
│  2. ACK                                                             │
│     Extension: emit('job:ack', { jobId, agentId })                  │
│     → DB: status=RUNNING, assignedAgentId                           │
│                                                                     │
│  3. PROGRESS                                                        │
│     Extension: emit('job:progress', { jobId, progress, message })   │
│     → DB: progress=N                                                │
│     → DB: JobLog created                                            │
│                                                                     │
│  4. EVIDENCE                                                        │
│     Extension: emit('job:evidence', { jobId, evidence[] })          │
│     → DB: Evidence records created                                  │
│                                                                     │
│  5. DONE                                                            │
│     Extension: emit('job:done', { jobId, output })                  │
│     → DB: status=COMPLETED, completedAt                             │
│                                                                     │
│  OR ERROR                                                           │
│     Extension: emit('job:error', { jobId, error, errorCode })       │
│     → DB: status=FAILED, error                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. What Can Be Reused for Publishing

| Component | Reusable? | Notes |
|-----------|-----------|-------|
| Job model structure | ✅ Yes | Add new job types |
| JobsService | ✅ Yes | Same lifecycle |
| AgentGateway | ✅ Yes | Same WebSocket pattern |
| AgentService | ⚠️ Partial | Add publishing methods |
| Evidence model | ⚠️ Partial | Rename to ProofAsset |
| JobLog | ✅ Yes | Same logging |

### New Job Types Needed

| Type | Description |
|------|-------------|
| `PUBLISH_POST` | Publish single post |
| `PUBLISH_VARIANT` | Publish post variant to platform |
| `SCHEDULE_POST` | Schedule future post |

### New Models Needed

| Model | Purpose |
|-------|---------|
| `PublishingJob` | Publishing-specific job |
| `PublishingRun` | Individual run attempt |
| `ProofAsset` | Screenshot/log proof |
| `DeviceAgent` | Extension device binding |

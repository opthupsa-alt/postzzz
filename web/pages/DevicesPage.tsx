import React, { useState, useEffect } from 'react';
import { Smartphone, Wifi, WifiOff, RefreshCw, Trash2, Building2, AlertCircle, Edit2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { getDevices, deleteDevice, updateDevice, DeviceAgent } from '../lib/devices-api';
import { getClients, Client } from '../lib/clients-api';

const STATUS_CONFIG = {
  ONLINE: { label: 'متصل', color: 'bg-green-50 text-green-600', dot: 'bg-green-500' },
  OFFLINE: { label: 'غير متصل', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
};

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceAgent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClientId, setEditClientId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [devicesData, clientsData] = await Promise.all([
        getDevices(),
        getClients(),
      ]);
      setDevices(devicesData);
      setClients(clientsData);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الأجهزة');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;
    try {
      await deleteDevice(deviceId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حذف الجهاز');
    }
  };

  const startEdit = (device: DeviceAgent) => {
    setEditingDevice(device.id);
    setEditName(device.name);
    setEditClientId(device.clientId || '');
  };

  const saveEdit = async () => {
    if (!editingDevice) return;
    try {
      await updateDevice(editingDevice, {
        name: editName,
        clientId: editClientId || undefined,
      });
      setEditingDevice(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحديث الجهاز');
    }
  };

  const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
  const offlineCount = devices.filter(d => d.status === 'OFFLINE').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="أجهزة النشر"
        subtitle="إدارة أجهزة Chrome Extension المتصلة"
        actions={
          <button 
            onClick={loadDevices}
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} />
            تحديث
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">إجمالي الأجهزة</p>
          <p className="text-3xl font-black text-gray-900">{devices.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">متصل</p>
          </div>
          <p className="text-3xl font-black text-green-600">{onlineCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">غير متصل</p>
          </div>
          <p className="text-3xl font-black text-gray-500">{offlineCount}</p>
        </div>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <EmptyState 
          icon={Smartphone}
          title="لا توجد أجهزة متصلة"
          description="قم بتثبيت إضافة Chrome وتسجيل الدخول لربط جهاز جديد"
          action={
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-500">
                1. ثبّت إضافة Postzzz من Chrome Web Store<br/>
                2. سجّل الدخول بحسابك<br/>
                3. اربط الجهاز بعميل
              </p>
            </div>
          }
        />
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {devices.map(device => {
              const statusConfig = STATUS_CONFIG[device.status];
              return (
                <div key={device.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${statusConfig.color}`}>
                        {device.status === 'ONLINE' ? (
                          <Wifi size={24} />
                        ) : (
                          <WifiOff size={24} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{device.name}</p>
                          <div className={`w-2 h-2 rounded-full ${statusConfig.dot} ${device.status === 'ONLINE' ? 'animate-pulse' : ''}`}></div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {device.version || device.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {device.client ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 size={16} className="text-gray-400" />
                          <span className="font-medium text-gray-700">{device.client.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">غير مرتبط بعميل</span>
                      )}
                      {device.lastSeenAt && (
                        <div className="text-left">
                          <p className="text-xs text-gray-400">آخر ظهور</p>
                          <p className="text-sm text-gray-600">
                            {new Date(device.lastSeenAt).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEdit(device)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} className="text-gray-400" />
                        </button>
                        <button 
                          onClick={() => handleDelete(device.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DevicesPage;

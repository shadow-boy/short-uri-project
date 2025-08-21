import React, { useEffect, useState } from 'react';
import { api, type Link, onLoadingChange } from '../api';
import { getToken, clearToken } from '../auth';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});

  const generateSlug = (length = 8) => {
    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let out = '';
    const randomBytes = new Uint32Array(length);
    (window.crypto || (window as any).msCrypto).getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
      out += alphabet[randomBytes[i] % alphabet.length];
    }
    return out.toLowerCase();
  };

  const load = async () => {
    try {
      const { data } = await api.get<Link[]>('/api/links');
      setLinks(data);
      
      // 获取每个链接的点击量
      const analyticsData: Record<string, number> = {};
      for (const link of data) {
        try {
          const { data: analyticsResult } = await api.get(`/api/analytics/${link.id}/basic`);
          analyticsData[link.id] = analyticsResult.totalClicks || 0;
        } catch (e) {
          analyticsData[link.id] = 0;
        }
      }
      setAnalytics(analyticsData);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || '加载失败');
    }
  };

  useEffect(() => {
    load();
    const off = onLoadingChange(setGlobalLoading);
    return () => off();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const slug = generateSlug(8);
      await api.post('/api/links', { slug, destinationUrl: url });
      setUrl('');
      await load();
      setMsg(`创建成功！短链: ${slug}`);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('确认删除这个短链吗？')) return;
    try {
      await api.delete(`/api/links/${id}`);
      await load();
      setMsg('删除成功');
    } catch (e: any) {
      setMsg(e?.response?.data?.error || '删除失败');
    }
  };

  const handleLogout = () => {
    clearToken();
    onLogout();
  };

  const copyToClipboard = async (slug: string) => {
    // 使用当前域名作为短链域名
    const shortUrl = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setMsg(`短链已复制: ${shortUrl}`);
    } catch (e) {
      setMsg('复制失败，请手动复制');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">短链管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理您的短链接</p>
        </div>
        <button 
          className="btn bg-red-600 hover:bg-red-700 text-white" 
          onClick={handleLogout}
        >
          退出登录
        </button>
      </div>

      {/* Create Form */}
      <div className="card mb-8 relative">
        {globalLoading && (
          <div className="absolute inset-0 bg-black/5 dark:bg-white/5 flex items-center justify-center rounded-lg">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">创建新短链</h2>
        <form onSubmit={create} className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="请输入目标 URL，如: https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            type="url"
          />
          <button className="btn btn-primary px-6" disabled={loading} type="submit">
            {loading ? (
              <div className="flex items-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                创建中...
              </div>
            ) : '创建短链'}
          </button>
        </form>
        {msg && (
          <div className={`mt-4 text-sm p-3 rounded-md ${
            msg.includes('成功') || msg.includes('复制') 
              ? 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20' 
              : 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20'
          }`}>
            {msg}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">总短链数</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{links.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">活跃链接</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {links.filter(l => l.isActive).length}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">总点击量</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {Object.values(analytics).reduce((sum, count) => sum + count, 0)}
          </p>
        </div>
      </div>

      {/* Links Table */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">短链列表</h2>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th">短链</th>
                <th className="th">目标地址</th>
                <th className="th">状态</th>
                <th className="th">点击量</th>
                <th className="th">创建时间</th>
                <th className="th">操作</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="td">
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                        {l.slug}
                      </code>
                      <button
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                        onClick={() => copyToClipboard(l.slug)}
                        title="复制短链"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                  <td className="td">
                    <a 
                      className="text-blue-600 hover:underline dark:text-blue-400 break-all" 
                      href={l.destinationUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      title={l.destinationUrl}
                    >
                      {l.destinationUrl.length > 50 
                        ? l.destinationUrl.substring(0, 50) + '...' 
                        : l.destinationUrl
                      }
                    </a>
                  </td>
                  <td className="td">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      l.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {l.isActive ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="td">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      {analytics[l.id] || 0}
                    </span>
                  </td>
                  <td className="td text-gray-600 dark:text-gray-400">
                    {new Date(l.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="td">
                    <button 
                      className="btn bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1" 
                      onClick={() => remove(l.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr>
                  <td className="td text-center text-gray-500 dark:text-gray-400" colSpan={6}>
                    暂无短链，创建您的第一个短链吧！
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

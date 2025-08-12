import React, { useEffect, useState } from 'react';
import { api, type Link } from './api';

export default function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
    const { data } = await api.get<Link[]>('/api/links');
    setLinks(data);
  };

  useEffect(() => {
    load();
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
      setMsg(`创建成功，Slug: ${slug}`);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('确认删除?')) return;
    await api.delete(`/api/links/${id}`);
    await load();
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">短链管理</h1>
      </div>

      <div className="card mb-6">
        <form onSubmit={create} className="flex gap-3">
          <input
            className="input"
            placeholder="目标 URL，如: https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? '创建中…' : '创建'}
          </button>
        </form>
        {msg && <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">{msg}</div>}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th className="th">Slug</th>
              <th className="th">目标地址</th>
              <th className="th">状态</th>
              <th className="th">创建时间</th>
              <th className="th">操作</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td className="td font-mono">{l.slug}</td>
                <td className="td break-all">
                  <a className="text-blue-600 hover:underline" href={l.destinationUrl} target="_blank" rel="noreferrer">
                    {l.destinationUrl}
                  </a>
                </td>
                <td className="td">{l.isActive ? '启用' : '禁用'}</td>
                <td className="td">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="td">
                  <button className="btn -mt-[12px]" onClick={() => remove(l.id)}>删除</button>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td className="td" colSpan={5}>暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



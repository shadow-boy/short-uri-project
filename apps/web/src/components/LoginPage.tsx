import React, { useState } from 'react';
import { api } from '../api';
import { saveToken } from '../auth';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    
    try {
      const { data } = await api.post('/api/auth/login', { username, password });
      
      saveToken(data.token);
      setUsername('');
      setPassword('');
      onLoginSuccess();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.error || '登录失败';
      setMsg(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              短链管理系统
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              请使用管理员账户登录
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名
              </label>
              <input
                className="input w-full"
                placeholder="管理员用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <input
                className="input w-full"
                type="password"
                placeholder="管理员密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {msg && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {msg}
              </div>
            )}

            <button
              className="btn btn-primary w-full py-3 text-base font-medium"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  登录中...
                </div>
              ) : (
                '管理员登录'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

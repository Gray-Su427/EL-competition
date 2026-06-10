import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendCode, verifyCode, setNickname } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

type Step = 'email' | 'code' | 'nickname';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await sendCode(email);
      setStep('code');
      startCountdown();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await verifyCode(email, code);
      if (result.needNickname) {
        setStep('nickname');
      } else {
        await refreshUser();
        navigate('/user', { replace: true });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '验证失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNickname = async () => {
    setError('');
    setLoading(true);
    try {
      await setNickname(nick);
      await refreshUser();
      navigate('/user', { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '设置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">
          {step === 'email' && '邮箱登录'}
          {step === 'code' && '输入验证码'}
          {step === 'nickname' && '设置昵称'}
        </h2>

        {step === 'email' && (
          <>
            <p className="login-hint">使用南京大学邮箱登录</p>
            <label htmlFor="login-email" style={{ display: 'none' }}>邮箱地址</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="你的南大邮箱 @nju.edu.cn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
            />
            <button
              className="login-btn"
              onClick={handleSendCode}
              disabled={loading || !email.trim()}
            >
              {loading ? '发送中…' : '发送验证码'}
            </button>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="login-hint">验证码已发送至 {email}</p>
            <label htmlFor="login-code" style={{ display: 'none' }}>验证码</label>
            <input
              id="login-code"
              className="login-input login-code-input"
              type="text"
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 位验证码"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              autoFocus
            />
            <button
              className="login-btn"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? '验证中…' : '确认登录'}
            </button>
            <button
              className="login-resend"
              onClick={handleSendCode}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `${countdown}s 后可重发` : '重新发送'}
            </button>
          </>
        )}

        {step === 'nickname' && (
          <>
            <p className="login-hint">首次登录，给自己取个昵称吧</p>
            <label htmlFor="login-nickname" style={{ display: 'none' }}>昵称</label>
            <input
              id="login-nickname"
              className="login-input"
              type="text"
              name="nickname"
              autoComplete="name"
              maxLength={20}
              placeholder="你的昵称（1-20字）"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetNickname()}
              autoFocus
            />
            <button
              className="login-btn"
              onClick={handleSetNickname}
              disabled={loading || !nick.trim()}
            >
              {loading ? '保存中…' : '开始使用'}
            </button>
          </>
        )}

        {error && <p className="login-error">{error}</p>}

        <button className="login-back" onClick={() => navigate(-1)}>
          返回
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { guestLogin } = useAuthStore();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || ''}/auth/google`;
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 1 || trimmedNickname.length > 20) {
      setError('닉네임은 1-20자 사이여야 합니다');
      return;
    }

    setIsSubmitting(true);
    const result = await guestLogin(trimmedNickname);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || '로그인에 실패했습니다');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Music Quiz Game
          </h1>
          <p className="text-gray-600">Sign in to play with friends</p>
        </div>

        <div className="space-y-6">
          {/* Google Login */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 py-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Guest Login Form */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-700">게스트 로그인</h2>
            <form onSubmit={handleGuestLogin} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full py-3"
                disabled={isSubmitting || !nickname.trim()}
              >
                {isSubmitting ? '접속 중...' : '게스트로 시작하기'}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </Card>
    </div>
  );
};

export default Login;

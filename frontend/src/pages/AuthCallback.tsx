import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchUserWithToken, isLoading, user, error } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      if (token) {
        await fetchUserWithToken(token);
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, fetchUserWithToken, navigate]);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        navigate('/');
      } else if (error) {
        navigate('/login');
      }
    }
  }, [isLoading, user, error, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
        <p className="text-lg">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

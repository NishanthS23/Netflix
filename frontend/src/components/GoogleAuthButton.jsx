import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store.js';

const GoogleAuthButton = ({ text = 'continue_with' }) => {
  const navigate = useNavigate();
  const { googleLogin, isLoggingIn } = useAuthStore();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        toast.error('No credential received from Google');
        return;
      }
      await googleLogin(credentialResponse.credential);
      toast.success('Signed in successfully with Google!');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to sign in with Google';
      toast.error(message);
    }
  };

  const handleError = () => {
    toast.error('Google Sign-In failed or was closed');
  };

  if (!clientId) {
    return (
      <div className="w-full my-3 p-3 bg-neutral-900 border border-neutral-700 rounded text-center text-xs text-gray-400">
        Google Sign-In requires <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code>
      </div>
    );
  }

  const isRawIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname) && window.location.hostname !== '127.0.0.1';

  if (isRawIp) {
    const awsDnsUrl = `http://ec2-${window.location.hostname.replace(/\./g, '-')}.us-east-2.compute.amazonaws.com${window.location.pathname}${window.location.search}`;
    return (
      <div className="w-full space-y-3">
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black/80 px-3 text-neutral-400 tracking-wider font-semibold">OR</span>
          </div>
        </div>
        <div className="p-3 bg-neutral-900 border border-neutral-700 rounded text-center text-xs text-neutral-300 space-y-2">
          <p className="text-neutral-400">Google OAuth requires an authorized domain name:</p>
          <a
            href={awsDnsUrl}
            className="inline-block bg-white text-black font-semibold px-4 py-2 rounded text-xs hover:bg-neutral-200 transition shadow"
          >
            Continue on AWS Domain
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-700"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-black/80 px-3 text-neutral-400 tracking-wider font-semibold">OR</span>
        </div>
      </div>

      <div className="flex justify-center w-full">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="filled_black"
          shape="rectangular"
          size="large"
          text={text}
          width="100%"
          disabled={isLoggingIn}
        />
      </div>
    </div>
  );
};

export default GoogleAuthButton;

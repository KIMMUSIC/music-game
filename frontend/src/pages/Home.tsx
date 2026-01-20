import { Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../stores/authStore';

const Home = () => {
  const { user } = useAuthStore();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {user?.nickname}!
          </h1>
          <p className="text-xl text-gray-600">
            Ready to test your music knowledge?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Create Quiz
              </h2>
              <p className="text-gray-600 mb-4">
                Build your own music quiz with your favorite songs
              </p>
              <Link to="/quiz/create" className="block">
                <Button className="w-full">Create Quiz</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Join Room
              </h2>
              <p className="text-gray-600 mb-4">
                Enter a room code to play with friends
              </p>
              <Link to="/room/join" className="block">
                <Button variant="outline" className="w-full">
                  Join Room
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <Link to="/profile">
              <Button variant="outline">View Profile</Button>
            </Link>
            <Link to="/quizzes">
              <Button variant="ghost">My Quizzes</Button>
            </Link>
            <Link to="/friends">
              <Button variant="ghost">Friends</Button>
            </Link>
            <Link to="/history">
              <Button variant="ghost">Game History</Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="ghost">Leaderboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Home;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { quizService, Quiz } from '../services/quiz';
import { useAuthStore } from '../stores/authStore';

const QuizDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadQuiz(id);
    }
  }, [id]);

  const loadQuiz = async (quizId: string) => {
    try {
      setIsLoading(true);
      const data = await quizService.getQuiz(quizId);
      setQuiz(data);
    } catch {
      setError('Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!quiz || !confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      await quizService.deleteQuiz(quiz.id);
      navigate('/quizzes');
    } catch {
      setError('Failed to delete quiz');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (error || !quiz) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Quiz Not Found
          </h1>
          <p className="text-gray-600 mb-6">{error || 'This quiz does not exist.'}</p>
          <Link to="/quizzes">
            <Button>Back to My Quizzes</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === quiz.creatorId;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              {quiz.isPublic ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Public
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Private
                </span>
              )}
            </div>
            {quiz.description && (
              <p className="text-gray-600">{quiz.description}</p>
            )}
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Link to={`/quiz/${quiz.id}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          )}
        </div>

        <Card className="p-6 mb-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {quiz.songs?.length || quiz.songCount}
              </div>
              <div className="text-sm text-gray-500">Songs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {quiz.hintsEnabled ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-500">Hints</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {quiz.playCount}
              </div>
              <div className="text-sm text-gray-500">Plays</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Songs</h2>

          {quiz.songs && quiz.songs.length > 0 ? (
            <div className="space-y-3">
              {quiz.songs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{song.title}</div>
                    <div className="text-sm text-gray-500">{song.artist}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {song.playDuration}s
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No songs available</p>
          )}
        </Card>

        <div className="flex justify-between">
          <Link to="/quizzes">
            <Button variant="outline">Back to My Quizzes</Button>
          </Link>

          <Button onClick={() => navigate(`/room/create?quizId=${quiz.id}`)}>
            Start Game
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default QuizDetail;

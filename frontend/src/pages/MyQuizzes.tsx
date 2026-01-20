import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { quizService, Quiz } from '../services/quiz';

const MyQuizzes = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const data = await quizService.getMyQuizzes();
      setQuizzes(data);
    } catch {
      setError('Failed to load quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      await quizService.deleteQuiz(id);
      setQuizzes(quizzes.filter((q) => q.id !== id));
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
          <Link to="/quiz/create">
            <Button>Create Quiz</Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {quizzes.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500 mb-4">
              You haven't created any quizzes yet.
            </div>
            <Link to="/quiz/create">
              <Button>Create Your First Quiz</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {quiz.title}
                      </h2>
                      {quiz.isPublic ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Public
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Private
                        </span>
                      )}
                    </div>
                    {quiz.description && (
                      <p className="text-gray-600 text-sm mb-2">
                        {quiz.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{quiz.songCount} songs</span>
                      <span>{quiz.playCount} plays</span>
                      <span>
                        Created {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/quiz/${quiz.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <Link to={`/quiz/${quiz.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(quiz.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyQuizzes;

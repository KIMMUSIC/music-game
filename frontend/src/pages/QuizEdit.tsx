import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/common/Layout';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { quizService, Song, MatchMode } from '../services/quiz';

interface SongInput extends Song {
  file?: File;
  isUploading?: boolean;
  inputType: 'upload' | 'youtube';
  youtubeUrl?: string;
}

const QuizEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [songs, setSongs] = useState<SongInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadQuiz(id);
    }
  }, [id]);

  const detectInputType = (audioUrl: string): 'upload' | 'youtube' => {
    const youtubePatterns = [
      /youtube\.com\/watch/,
      /youtu\.be\//,
      /youtube\.com\/embed/,
      /youtube\.com\/shorts/,
    ];
    for (const pattern of youtubePatterns) {
      if (pattern.test(audioUrl)) {
        return 'youtube';
      }
    }
    return 'upload';
  };

  const loadQuiz = async (quizId: string) => {
    try {
      setIsLoading(true);
      const quiz = await quizService.getQuiz(quizId);
      setTitle(quiz.title);
      setDescription(quiz.description || '');
      setIsPublic(quiz.isPublic);
      setHintsEnabled(quiz.hintsEnabled || false);
      setSongs((quiz.songs || []).map(song => {
        const inputType = detectInputType(song.audioUrl);
        return {
          ...song,
          inputType,
          youtubeUrl: inputType === 'youtube' ? song.audioUrl : '',
        };
      }));
    } catch {
      setError('Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const addSong = () => {
    setSongs([
      ...songs,
      {
        title: '',
        artist: '',
        audioUrl: '',
        sourceType: 'upload',
        startTime: 0,
        playDuration: 10,
        timeLimit: 30,
        orderIndex: songs.length,
        inputType: 'upload',
        youtubeUrl: '',
        matchMode: 'title_and_artist',
        alternativeAnswers: [],
        genre: '',
        releaseYear: undefined,
        hint: '',
      },
    ]);
  };

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleYoutubeUrlChange = (index: number, url: string) => {
    setSongs((prevSongs) => {
      const updated = [...prevSongs];
      updated[index] = {
        ...updated[index],
        youtubeUrl: url,
        audioUrl: url,
        sourceType: 'youtube',
      };
      return updated;
    });
  };

  const handleInputTypeChange = (index: number, type: 'upload' | 'youtube') => {
    setSongs((prevSongs) => {
      const updated = [...prevSongs];
      updated[index] = {
        ...updated[index],
        inputType: type,
        audioUrl: '',
        sourceType: type,
        youtubeUrl: '',
        file: undefined,
      };
      return updated;
    });
  };

  const updateSong = (index: number, field: keyof SongInput, value: string | number | File | boolean | string[]) => {
    const updated = [...songs];
    updated[index] = { ...updated[index], [field]: value };
    setSongs(updated);
  };

  const addAlternativeAnswer = (songIndex: number) => {
    setSongs((prevSongs) => {
      const updated = [...prevSongs];
      const altAnswers = updated[songIndex].alternativeAnswers || [];
      if (altAnswers.length < 5) {
        updated[songIndex] = {
          ...updated[songIndex],
          alternativeAnswers: [...altAnswers, ''],
        };
      }
      return updated;
    });
  };

  const updateAlternativeAnswer = (songIndex: number, answerIndex: number, value: string) => {
    setSongs((prevSongs) => {
      const updated = [...prevSongs];
      const altAnswers = [...(updated[songIndex].alternativeAnswers || [])];
      altAnswers[answerIndex] = value;
      updated[songIndex] = { ...updated[songIndex], alternativeAnswers: altAnswers };
      return updated;
    });
  };

  const removeAlternativeAnswer = (songIndex: number, answerIndex: number) => {
    setSongs((prevSongs) => {
      const updated = [...prevSongs];
      const altAnswers = (updated[songIndex].alternativeAnswers || []).filter(
        (_, i) => i !== answerIndex
      );
      updated[songIndex] = { ...updated[songIndex], alternativeAnswers: altAnswers };
      return updated;
    });
  };

  const removeSong = (index: number) => {
    const updated = songs.filter((_, i) => i !== index);
    updated.forEach((song, i) => {
      song.orderIndex = i;
    });
    setSongs(updated);
  };

  const handleFileChange = async (index: number, file: File) => {
    updateSong(index, 'file', file);
    updateSong(index, 'isUploading', true);

    try {
      const { uploadUrl, audioUrl } = await quizService.getUploadUrl(file.name);
      const actualAudioUrl = await quizService.uploadAudio(uploadUrl, file);
      updateSong(index, 'audioUrl', actualAudioUrl || audioUrl);
    } catch {
      setError('Failed to upload audio file');
    } finally {
      updateSong(index, 'isUploading', false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    if (!title.trim()) {
      setError('Please enter a quiz title');
      return;
    }

    if (songs.length === 0) {
      setError('Please add at least one song');
      return;
    }

    const invalidSongs = songs.filter((s) => {
      if (!s.title.trim() || !s.artist.trim()) return true;
      if (s.inputType === 'youtube') {
        return !s.youtubeUrl || !extractYoutubeVideoId(s.youtubeUrl);
      }
      return !s.audioUrl;
    });

    if (invalidSongs.length > 0) {
      setError('Please fill in all song details and provide valid audio sources');
      return;
    }

    setIsSubmitting(true);

    try {
      await quizService.updateQuiz(id, {
        title,
        description: description || undefined,
        isPublic,
        hintsEnabled,
        songs: songs.map(({ file, isUploading, inputType, youtubeUrl, ...song }) => ({
          ...song,
          audioUrl: inputType === 'youtube' ? youtubeUrl! : song.audioUrl,
          sourceType: inputType,
          timeLimit: song.timeLimit || 30,
          matchMode: song.matchMode || 'title_and_artist',
          alternativeAnswers: (song.alternativeAnswers || []).filter((a) => a.trim() !== ''),
          genre: song.genre?.trim() || undefined,
          releaseYear: song.releaseYear || undefined,
          hint: hintsEnabled && song.hint?.trim() ? song.hint.trim() : undefined,
        })),
      });

      navigate(`/quiz/${id}`);
    } catch {
      setError('Failed to update quiz');
    } finally {
      setIsSubmitting(false);
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
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Quiz</h1>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quiz Details
            </h2>

            <div className="space-y-4">
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
                maxLength={100}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your quiz"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Make quiz public
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hintsEnabled"
                  checked={hintsEnabled}
                  onChange={(e) => setHintsEnabled(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="hintsEnabled" className="text-sm text-gray-700">
                  Enable hints (reveals after 5 seconds with -10% point penalty)
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Songs ({songs.length})
              </h2>
              <Button type="button" variant="outline" onClick={addSong}>
                Add Song
              </Button>
            </div>

            {songs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No songs added yet. Click "Add Song" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {songs.map((song, index) => (
                  <div
                    key={song.id || index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-500">
                        Song {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSong(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <Input
                        label="Song Title"
                        value={song.title}
                        onChange={(e) => updateSong(index, 'title', e.target.value)}
                        placeholder="Song title"
                      />
                      <Input
                        label="Artist"
                        value={song.artist}
                        onChange={(e) => updateSong(index, 'artist', e.target.value)}
                        placeholder="Artist name"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Audio Source
                      </label>
                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`source-${index}`}
                            checked={song.inputType === 'upload'}
                            onChange={() => handleInputTypeChange(index, 'upload')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">Upload File</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`source-${index}`}
                            checked={song.inputType === 'youtube'}
                            onChange={() => handleInputTypeChange(index, 'youtube')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">YouTube Link</span>
                        </label>
                      </div>

                      {song.inputType === 'upload' ? (
                        <>
                          {song.audioUrl && !song.file && (
                            <p className="text-sm text-green-600 mb-2">
                              Audio file already uploaded
                            </p>
                          )}
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileChange(index, file);
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                          />
                          {song.isUploading && (
                            <p className="text-sm text-purple-600 mt-1">
                              Uploading...
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <input
                            type="url"
                            value={song.youtubeUrl || ''}
                            onChange={(e) => handleYoutubeUrlChange(index, e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          {song.youtubeUrl && extractYoutubeVideoId(song.youtubeUrl) && (
                            <p className="text-sm text-green-600 mt-1">
                              Valid YouTube link
                            </p>
                          )}
                          {song.youtubeUrl && !extractYoutubeVideoId(song.youtubeUrl) && (
                            <p className="text-sm text-red-600 mt-1">
                              Invalid YouTube URL
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time (sec)
                        </label>
                        <input
                          type="number"
                          value={song.startTime}
                          onChange={(e) =>
                            updateSong(index, 'startTime', parseInt(e.target.value) || 0)
                          }
                          min={0}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Play Duration (sec)
                        </label>
                        <input
                          type="number"
                          value={song.playDuration}
                          onChange={(e) =>
                            updateSong(index, 'playDuration', parseInt(e.target.value) || 10)
                          }
                          min={1}
                          max={60}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time Limit (sec)
                        </label>
                        <input
                          type="number"
                          value={song.timeLimit}
                          onChange={(e) =>
                            updateSong(index, 'timeLimit', parseInt(e.target.value) || 30)
                          }
                          min={5}
                          max={300}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Audio plays from {song.startTime}s to {song.startTime + song.playDuration}s. Players have {song.timeLimit}s to answer.
                    </p>

                    {/* Answer Settings */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Answer Match Mode
                        </label>
                        <select
                          value={song.matchMode || 'title_and_artist'}
                          onChange={(e) =>
                            updateSong(index, 'matchMode', e.target.value as MatchMode)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="title_only">Title Only</option>
                          <option value="title_and_artist">Title and Artist</option>
                          <option value="exact">Exact Match</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Alternative Answers (optional)
                          </label>
                          <button
                            type="button"
                            onClick={() => addAlternativeAnswer(index)}
                            disabled={(song.alternativeAnswers?.length || 0) >= 5}
                            className="text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                          >
                            + Add Alternative
                          </button>
                        </div>
                        {(song.alternativeAnswers || []).map((alt, altIndex) => (
                          <div key={altIndex} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={alt}
                              onChange={(e) =>
                                updateAlternativeAnswer(index, altIndex, e.target.value)
                              }
                              placeholder={`Alternative answer ${altIndex + 1}`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeAlternativeAnswer(index, altIndex)}
                              className="text-red-500 hover:text-red-700 px-2"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hint Input */}
                    {hintsEnabled && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hint (optional)
                        </label>
                        <input
                          type="text"
                          value={song.hint || ''}
                          onChange={(e) => updateSong(index, 'hint', e.target.value)}
                          placeholder="e.g., This song was released in 2020"
                          maxLength={500}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/quiz/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default QuizEdit;

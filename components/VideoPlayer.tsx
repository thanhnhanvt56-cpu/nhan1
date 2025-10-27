import React, { useRef, useState, useEffect } from 'react';
import type { Question, MultipleChoiceQuestion, TrueFalseQuestion, OrderingQuestion, AnswerOption } from '../types';
import { QuestionType } from '../types';

interface VideoPlayerProps {
  videoUrl: string;
  questions: Question[];
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onTimelineClick: (time: number) => void;
  onQuestionTrigger: (question: Question) => void;
  activeQuestion: Question | null;
  onQuestionResult: (isCorrect: boolean) => void;
  playerRef: React.RefObject<HTMLVideoElement>;
  currentTime: number;
}

const formatTime = (time: number) => {
  if (isNaN(time)) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const MultipleChoiceOverlay: React.FC<{ question: MultipleChoiceQuestion; onResult: (isCorrect: boolean) => void }> = ({ question, onResult }) => {
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const handleAnswer = () => setShowResult(true);
  const isCorrect = selectedAnswerId === question.correctAnswerId;

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-xl text-slate-800">
      <h3 className="text-xl md:text-2xl font-bold mb-4">{question.questionText}</h3>
      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => !showResult && setSelectedAnswerId(option.id)}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 text-base md:text-lg ${ selectedAnswerId === option.id ? 'bg-sky-100 border-sky-500 ring-2 ring-sky-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'} ${ showResult && (option.id === question.correctAnswerId ? 'bg-green-100 border-green-500' : (selectedAnswerId === option.id ? 'bg-red-100 border-red-500' : ''))}`}
          >
            {option.text}
          </button>
        ))}
      </div>
      <div className="mt-6 text-right">
        {!showResult ? (
          <button onClick={handleAnswer} disabled={!selectedAnswerId} className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
            Trả lời
          </button>
        ) : (
          <div className='flex justify-between items-center'>
            <p className={`font-bold text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{isCorrect ? 'Chính xác!' : 'Không chính xác!'}</p>
            <button onClick={() => onResult(isCorrect)} className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-colors">Tiếp tục</button>
          </div>
        )}
      </div>
    </div>
  );
};

const TrueFalseOverlay: React.FC<{ question: TrueFalseQuestion; onResult: (isCorrect: boolean) => void }> = ({ question, onResult }) => {
    const options = [{id: 'true', text: 'Đúng'}, {id: 'false', text: 'Sai'}];
    return <MultipleChoiceOverlay question={{...question, type: QuestionType.MultipleChoice, options}} onResult={onResult} />;
};

const OrderingOverlay: React.FC<{ question: OrderingQuestion; onResult: (isCorrect: boolean) => void }> = ({ question, onResult }) => {
    const [userItems, setUserItems] = useState(() => shuffle(question.items));
    const [showResult, setShowResult] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    
    const handleDrop = (dropIndex: number) => {
        if (draggedIndex === null) return;
        const draggedItem = userItems[draggedIndex];
        const newItems = [...userItems];
        newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);
        setUserItems(newItems);
        setDraggedIndex(null);
    };

    const isCorrect = question.items.every((item, index) => item.id === userItems[index].id);

    return (
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-xl text-slate-800">
        <h3 className="text-xl md:text-2xl font-bold mb-2">{question.questionText}</h3>
        <p className="text-slate-500 mb-4">Kéo và thả để sắp xếp các mục theo đúng thứ tự.</p>
        <div className="space-y-3">
          {userItems.map((item, index) => (
            <div
              key={item.id}
              draggable={!showResult}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 text-base md:text-lg cursor-move flex items-center bg-slate-50 border-slate-200 ${draggedIndex === index ? 'opacity-50' : ''} ${showResult ? (isCorrect ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500') : 'hover:bg-slate-100 hover:border-slate-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-3 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              {item.text}
            </div>
          ))}
        </div>
        <div className="mt-6 text-right">
          {!showResult ? (
            <button onClick={() => setShowResult(true)} className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg shadow-md hover:bg-sky-600 transition-colors">
              Kiểm tra
            </button>
          ) : (
            <div className='flex justify-between items-center'>
              <p className={`font-bold text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{isCorrect ? 'Chính xác!' : 'Không chính xác!'}</p>
              <button onClick={() => onResult(isCorrect)} className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-colors">Tiếp tục</button>
            </div>
          )}
        </div>
      </div>
    );
};

const QuestionOverlay: React.FC<{ question: Question; onResult: (isCorrect: boolean) => void }> = ({ question, onResult }) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-20">
      <div className="transform transition-all scale-100 opacity-100 w-full max-w-xl">
        {question.type === QuestionType.MultipleChoice && <MultipleChoiceOverlay question={question} onResult={onResult} />}
        {question.type === QuestionType.TrueFalse && <TrueFalseOverlay question={question} onResult={onResult} />}
        {question.type === QuestionType.Ordering && <OrderingOverlay question={question} onResult={onResult} />}
      </div>
    </div>
  );
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  questions,
  onTimeUpdate,
  onDurationChange,
  onTimelineClick,
  onQuestionTrigger,
  activeQuestion,
  onQuestionResult,
  playerRef,
  currentTime,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    
    const handleTimeUpdate = () => {
        if (player.seeking) return;
        onTimeUpdate(player.currentTime);
        for(const q of questions) {
            // Trigger slightly before the exact time to avoid skipping
            if (player.currentTime >= q.time && player.currentTime < q.time + 0.5 && !player.paused && !activeQuestion) {
                player.pause();
                onQuestionTrigger(q);
                break;
            }
        }
    };
    const handleDurationChange = () => {
        setDuration(player.duration);
        onDurationChange(player.duration);
    };

    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('loadedmetadata', handleDurationChange);
    
    return () => {
        player.removeEventListener('timeupdate', handleTimeUpdate);
        player.removeEventListener('loadedmetadata', handleDurationChange);
    };
  }, [playerRef, questions, onTimeUpdate, onDurationChange, onQuestionTrigger, activeQuestion]);

  const handleTimelineClickInternal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current && duration > 0) {
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const clickedTime = (clickX / width) * duration;
      if (playerRef.current) {
        playerRef.current.currentTime = clickedTime;
      }
      onTimelineClick(clickedTime);
    }
  };

  return (
    <div className="w-full bg-slate-900 rounded-xl shadow-2xl overflow-hidden relative">
      <video ref={playerRef} src={videoUrl} controls className="w-full aspect-video" />
      {activeQuestion && <QuestionOverlay question={activeQuestion} onResult={onQuestionResult} />}
      <div className="p-4 bg-slate-800 bg-opacity-80">
        <div 
          ref={timelineRef}
          onClick={handleTimelineClickInternal}
          className="relative h-2.5 bg-slate-600 rounded-full cursor-pointer group"
        >
          <div 
            className="absolute top-0 left-0 h-full bg-sky-400 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          ></div>
          <div 
            className="absolute top-1/2 left-0 h-4 w-4 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full shadow-md"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          ></div>

          {questions.map((q) => (
            <div
              key={q.id}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full border-2 border-slate-800 hover:scale-150 transition-transform"
              style={{ left: `${(q.time / duration) * 100}%` }}
              title={`Câu hỏi lúc ${formatTime(q.time)}`}
            ></div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-300 mt-2 px-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import type { Question } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import { QuestionEditor } from './components/QuestionEditor';
import { UploadIcon, VideoIcon, HtmlIcon } from './components/Icons';

declare const JSZip: any;

const Header: React.FC = () => (
    <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                       <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-orange-400">
                           Video Tương Tác
                       </h1>
                    </div>
                </div>
            </div>
        </div>
    </header>
);

const VideoUploader: React.FC<{ onVideoSelect: (file: File) => void }> = ({ onVideoSelect }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onVideoSelect(file);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl text-center">
            <UploadIcon className="w-16 h-16 mx-auto text-sky-400" />
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Tải video của bạn lên</h2>
            <p className="mt-2 text-slate-500">Kéo và thả hoặc nhấp để chọn một tệp video để bắt đầu.</p>
            <div className="mt-6">
                <label htmlFor="video-upload" className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-transform hover:scale-105">
                    Chọn video
                </label>
                <input id="video-upload" type="file" className="sr-only" accept="video/*" onChange={handleFileChange} />
            </div>
        </div>
    );
};

const generateHtmlContent = (videoDataUrl: string, questionsJson: string, videoType: string): string => {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Tương Tác</title>
    <style>
        :root { --sky-500: #0ea5e9; --orange-500: #f97316; --green-600: #16a34a; --red-600: #dc2626; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; box-sizing: border-box; }
        .container { max-width: 900px; width: 100%; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border-radius: 0.75rem; overflow: hidden; background-color: #000; }
        video { display: block; width: 100%; height: auto; }
        #overlay { position: absolute; inset: 0; background-color: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; padding: 1rem; z-index: 10; }
        .question-box { background-color: white; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 2rem; width: 100%; max-width: 500px; color: #1e293b; }
        .question-box h3 { margin: 0 0 1rem; font-size: 1.5rem; }
        .question-box .options { display: flex; flex-direction: column; gap: 0.75rem; }
        .question-box .option-btn { width: 100%; text-align: left; padding: 0.75rem; border-radius: 0.5rem; border: 2px solid #e2e8f0; background-color: #f8fafc; cursor: pointer; transition: all 0.2s; font-size: 1rem; }
        .question-box .option-btn:hover { border-color: #cbd5e1; background-color: #f1f5f9; }
        .question-box .option-btn.selected { border-color: var(--sky-500); background-color: #eff6ff; box-shadow: 0 0 0 2px #bae6fd; }
        .question-box .option-btn.correct { border-color: #16a34a; background-color: #f0fdf4; }
        .question-box .option-btn.incorrect { border-color: #dc2626; background-color: #fef2f2; }
        .question-box .drag-item { display: flex; align-items: center; cursor: move; user-select: none; }
        .question-box .drag-item.dragging { opacity: 0.5; }
        .question-box .drag-handle { margin-right: 0.75rem; color: #94a3b8; }
        .footer { margin-top: 1.5rem; text-align: right; }
        .footer .result { float: left; font-weight: bold; font-size: 1.125rem; }
        .footer .result.correct { color: var(--green-600); }
        .footer .result.incorrect { color: var(--red-600); }
        .footer button { padding: 0.5rem 1.5rem; background-color: var(--sky-500); color: white; font-weight: 600; border-radius: 0.5rem; border: none; cursor: pointer; transition: background-color 0.2s; }
        .footer button:hover { background-color: #0284c7; }
        .footer button:disabled { background-color: #94a3b8; cursor: not-allowed; }
        .footer button.continue { background-color: var(--orange-500); }
        .footer button.continue:hover { background-color: #f97316; }
    </style>
</head>
<body>
    <div class="container">
        <video id="videoPlayer" controls>
            <source src="${videoDataUrl}" type="${videoType}">
        </video>
        <div id="overlay">
            <div id="question-container" class="question-box"></div>
        </div>
    </div>

    <script>
        const video = document.getElementById('videoPlayer');
        const overlay = document.getElementById('overlay');
        const questionContainer = document.getElementById('question-container');
        const questions = ${questionsJson}.sort((a,b) => a.time - b.time);

        let activeQuestion = null;
        let triggeredQuestions = new Set();
        let currentOrdering = [];

        video.addEventListener('timeupdate', () => {
            if (video.seeking) return;
            
            const currentTime = video.currentTime;
            for (const q of questions) {
                if (currentTime >= q.time && currentTime < q.time + 0.5 && !triggeredQuestions.has(q.id)) {
                    video.pause();
                    activeQuestion = q;
                    triggeredQuestions.add(q.id);
                    renderQuestion(q);
                    break;
                }
            }
        });
        
        video.addEventListener('play', () => {
            // Reset triggered questions if user seeks back
            const firstFutureQuestionIndex = questions.findIndex(q => q.time > video.currentTime);
            const resetFromIndex = firstFutureQuestionIndex === -1 ? questions.length : firstFutureQuestionIndex;
            questions.slice(resetFromIndex).forEach(q => triggeredQuestions.delete(q.id));
        });

        function shuffle(array) {
            let currentIndex = array.length, randomIndex;
            while (currentIndex != 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
            }
            return array;
        }

        function renderQuestion(q) {
            let content = \`<h3>\${q.questionText}</h3><div class="options">\`;
            
            if (q.type === 'MULTIPLE_CHOICE') {
                q.options.forEach(opt => {
                    content += \`<button class="option-btn" data-id="\${opt.id}">\${opt.text}</button>\`;
                });
            } else if (q.type === 'TRUE_FALSE') {
                content += \`<button class="option-btn" data-id="true">Đúng</button>\`;
                content += \`<button class="option-btn" data-id="false">Sai</button>\`;
            } else if (q.type === 'ORDERING') {
                content += \`<p style="margin: -0.5rem 0 0.5rem; color: #64748b;">Kéo và thả để sắp xếp theo đúng thứ tự.</p>\`
                currentOrdering = shuffle([...q.items]);
                currentOrdering.forEach((item, index) => {
                    content += \`<div class="option-btn drag-item" draggable="true" data-index="\${index}">
                        <span class="drag-handle">☰</span>
                        <span>\${item.text}</span>
                    </div>\`;
                });
            }
            
            content += \`</div><div class="footer"><button id="submitBtn">\${q.type === 'ORDERING' ? 'Kiểm tra' : 'Trả lời'}</button></div>\`;
            questionContainer.innerHTML = content;
            overlay.style.display = 'flex';
            attachEventListeners(q);
        }

        function attachEventListeners(q) {
            if (q.type === 'ORDERING') {
                let draggedIndex = null;
                document.querySelectorAll('.drag-item').forEach(item => {
                    item.addEventListener('dragstart', (e) => {
                        draggedIndex = parseInt(e.currentTarget.dataset.index);
                        e.currentTarget.classList.add('dragging');
                    });
                    item.addEventListener('dragend', (e) => e.currentTarget.classList.remove('dragging'));
                    item.addEventListener('dragover', (e) => e.preventDefault());
                    item.addEventListener('drop', (e) => {
                        e.preventDefault();
                        const dropIndex = parseInt(e.currentTarget.dataset.index);
                        const draggedItem = currentOrdering[draggedIndex];
                        currentOrdering.splice(draggedIndex, 1);
                        currentOrdering.splice(dropIndex, 0, draggedItem);
                        renderQuestion(q); // Re-render to show new order
                    });
                });
            } else {
                let selectedId = null;
                document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedId = btn.dataset.id;
                    });
                });
                document.getElementById('submitBtn').addEventListener('click', () => {
                    if (selectedId) handleSubmit(q, selectedId);
                });
            }
             document.getElementById('submitBtn').addEventListener('click', () => {
                if (q.type === 'ORDERING') {
                    const isCorrect = currentOrdering.every((item, index) => item.id === q.items[index].id);
                    handleSubmit(q, isCorrect);
                }
            });
        }
        
        function handleSubmit(q, answer) {
            const footer = questionContainer.querySelector('.footer');
            let isCorrect;

            if (q.type === 'ORDERING') {
                isCorrect = answer; // Answer is already boolean
                document.querySelectorAll('.drag-item').forEach(item => {
                    item.setAttribute('draggable', 'false');
                    item.classList.add(isCorrect ? 'correct' : 'incorrect');
                });
            } else {
                isCorrect = answer === q.correctAnswerId;
                 document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.disabled = true;
                    if(btn.dataset.id === q.correctAnswerId) btn.classList.add('correct');
                    else if(btn.dataset.id === answer) btn.classList.add('incorrect');
                });
            }
            
            const resultText = isCorrect ? 'Chính xác!' : 'Không chính xác!';
            const resultClass = isCorrect ? 'correct' : 'incorrect';
            footer.innerHTML = \`<span class="result \${resultClass}">\${resultText}</span> <button id="continueBtn" class="continue">Tiếp tục</button>\`;
            
            document.getElementById('continueBtn').addEventListener('click', () => {
                overlay.style.display = 'none';
                questionContainer.innerHTML = '';
                if (isCorrect) {
                     if (video.currentTime < activeQuestion.time + 0.5) {
                        video.currentTime = activeQuestion.time + 0.5;
                    }
                    video.play();
                } else {
                    const currentIndex = questions.findIndex(item => item.id === q.id);
                    const rewindTime = currentIndex > 0 ? questions[currentIndex - 1].time : 0;
                    video.currentTime = rewindTime;
                    video.play();
                }
                activeQuestion = null;
            });
        }
    </script>
</body>
</html>`;
};

const generatePackagedHtmlContent = (videoFileName: string): string => {
  // This is a simplified version of the above script, but it references a local video file
  // and a local questions.js file instead of having them embedded.
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Tương Tác</title>
    <style>
        :root { --sky-500: #0ea5e9; --orange-500: #f97316; --green-600: #16a34a; --red-600: #dc2626; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 1rem; box-sizing: border-box; }
        .container { max-width: 900px; width: 100%; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border-radius: 0.75rem; overflow: hidden; background-color: #000; }
        video { display: block; width: 100%; height: auto; }
        #overlay { position: absolute; inset: 0; background-color: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; padding: 1rem; z-index: 10; }
        .question-box { background-color: white; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 2rem; width: 100%; max-width: 500px; color: #1e293b; }
        .question-box h3 { margin: 0 0 1rem; font-size: 1.5rem; }
        .question-box .options { display: flex; flex-direction: column; gap: 0.75rem; }
        .question-box .option-btn { width: 100%; text-align: left; padding: 0.75rem; border-radius: 0.5rem; border: 2px solid #e2e8f0; background-color: #f8fafc; cursor: pointer; transition: all 0.2s; font-size: 1rem; }
        .question-box .option-btn:hover { border-color: #cbd5e1; background-color: #f1f5f9; }
        .question-box .option-btn.selected { border-color: var(--sky-500); background-color: #eff6ff; box-shadow: 0 0 0 2px #bae6fd; }
        .question-box .option-btn.correct { border-color: #16a34a; background-color: #f0fdf4; }
        .question-box .option-btn.incorrect { border-color: #dc2626; background-color: #fef2f2; }
        .question-box .drag-item { display: flex; align-items: center; cursor: move; user-select: none; }
        .question-box .drag-item.dragging { opacity: 0.5; }
        .question-box .drag-handle { margin-right: 0.75rem; color: #94a3b8; }
        .footer { margin-top: 1.5rem; text-align: right; }
        .footer .result { float: left; font-weight: bold; font-size: 1.125rem; }
        .footer .result.correct { color: var(--green-600); }
        .footer .result.incorrect { color: var(--red-600); }
        .footer button { padding: 0.5rem 1.5rem; background-color: var(--sky-500); color: white; font-weight: 600; border-radius: 0.5rem; border: none; cursor: pointer; transition: background-color 0.2s; }
        .footer button:hover { background-color: #0284c7; }
        .footer button:disabled { background-color: #94a3b8; cursor: not-allowed; }
        .footer button.continue { background-color: var(--orange-500); }
        .footer button.continue:hover { background-color: #f97316; }
    </style>
</head>
<body>
    <div class="container">
        <video id="videoPlayer" controls>
            <source src="${videoFileName}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div id="overlay">
            <div id="question-container" class="question-box"></div>
        </div>
    </div>
    <script src="questions.js"></script>
    <script>
        // The interactive logic is identical to the other template, but it uses
        // the \`window.interactiveQuestions\` variable defined in questions.js
        const video = document.getElementById('videoPlayer');
        const overlay = document.getElementById('overlay');
        const questionContainer = document.getElementById('question-container');
        // FIX: Use bracket notation to access window.interactiveQuestions to avoid TypeScript error.
        const questions = (window['interactiveQuestions'] || []).sort((a,b) => a.time - b.time);

        let activeQuestion = null;
        let triggeredQuestions = new Set();
        let currentOrdering = [];

        video.addEventListener('timeupdate', () => {
            if (video.seeking) return;
            
            const currentTime = video.currentTime;
            for (const q of questions) {
                if (currentTime >= q.time && currentTime < q.time + 0.5 && !triggeredQuestions.has(q.id)) {
                    video.pause();
                    activeQuestion = q;
                    triggeredQuestions.add(q.id);
                    renderQuestion(q);
                    break;
                }
            }
        });
        
        video.addEventListener('play', () => {
            const firstFutureQuestionIndex = questions.findIndex(q => q.time > video.currentTime);
            const resetFromIndex = firstFutureQuestionIndex === -1 ? questions.length : firstFutureQuestionIndex;
            questions.slice(resetFromIndex).forEach(q => triggeredQuestions.delete(q.id));
        });

        function shuffle(array) {
            let currentIndex = array.length, randomIndex;
            while (currentIndex != 0) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;
                [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
            }
            return array;
        }

        function renderQuestion(q) {
            let content = \`<h3>\${q.questionText}</h3><div class="options">\`;
            if (q.type === 'MULTIPLE_CHOICE') {
                q.options.forEach(opt => { content += \`<button class="option-btn" data-id="\${opt.id}">\${opt.text}</button>\`; });
            } else if (q.type === 'TRUE_FALSE') {
                content += \`<button class="option-btn" data-id="true">Đúng</button><button class="option-btn" data-id="false">Sai</button>\`;
            } else if (q.type === 'ORDERING') {
                content += \`<p style="margin: -0.5rem 0 0.5rem; color: #64748b;">Kéo và thả để sắp xếp theo đúng thứ tự.</p>\`
                currentOrdering = shuffle([...q.items]);
                currentOrdering.forEach((item, index) => {
                    content += \`<div class="option-btn drag-item" draggable="true" data-index="\${index}"><span class="drag-handle">☰</span><span>\${item.text}</span></div>\`;
                });
            }
            content += \`</div><div class="footer"><button id="submitBtn">\${q.type === 'ORDERING' ? 'Kiểm tra' : 'Trả lời'}</button></div>\`;
            questionContainer.innerHTML = content;
            overlay.style.display = 'flex';
            attachEventListeners(q);
        }

        function attachEventListeners(q) {
            if (q.type === 'ORDERING') {
                let draggedIndex = null;
                document.querySelectorAll('.drag-item').forEach(item => {
                    item.addEventListener('dragstart', (e) => {
                        draggedIndex = parseInt(e.currentTarget.dataset.index);
                        e.currentTarget.classList.add('dragging');
                    });
                    item.addEventListener('dragend', (e) => e.currentTarget.classList.remove('dragging'));
                    item.addEventListener('dragover', (e) => e.preventDefault());
                    item.addEventListener('drop', (e) => {
                        e.preventDefault();
                        const dropIndex = parseInt(e.currentTarget.dataset.index);
                        const draggedItem = currentOrdering[draggedIndex];
                        currentOrdering.splice(draggedIndex, 1);
                        currentOrdering.splice(dropIndex, 0, draggedItem);
                        renderQuestion(q);
                    });
                });
            } else {
                let selectedId = null;
                document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedId = btn.dataset.id;
                    });
                });
                document.getElementById('submitBtn').addEventListener('click', () => { if (selectedId) handleSubmit(q, selectedId); });
            }
             document.getElementById('submitBtn').addEventListener('click', () => {
                if (q.type === 'ORDERING') {
                    const isCorrect = currentOrdering.every((item, index) => item.id === q.items[index].id);
                    handleSubmit(q, isCorrect);
                }
            });
        }
        
        function handleSubmit(q, answer) {
            const footer = questionContainer.querySelector('.footer');
            let isCorrect;
            if (q.type === 'ORDERING') {
                isCorrect = answer;
                document.querySelectorAll('.drag-item').forEach(item => { item.setAttribute('draggable', 'false'); item.classList.add(isCorrect ? 'correct' : 'incorrect'); });
            } else {
                isCorrect = answer === q.correctAnswerId;
                 document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.disabled = true;
                    if(btn.dataset.id === q.correctAnswerId) btn.classList.add('correct');
                    else if(btn.dataset.id === answer) btn.classList.add('incorrect');
                });
            }
            const resultText = isCorrect ? 'Chính xác!' : 'Không chính xác!';
            const resultClass = isCorrect ? 'correct' : 'incorrect';
            footer.innerHTML = \`<span class="result \${resultClass}">\${resultText}</span> <button id="continueBtn" class="continue">Tiếp tục</button>\`;
            document.getElementById('continueBtn').addEventListener('click', () => {
                overlay.style.display = 'none';
                questionContainer.innerHTML = '';
                if (isCorrect) {
                     if (video.currentTime < activeQuestion.time + 0.5) { video.currentTime = activeQuestion.time + 0.5; }
                    video.play();
                } else {
                    const currentIndex = questions.findIndex(item => item.id === q.id);
                    const rewindTime = currentIndex > 0 ? questions[currentIndex - 1].time : 0;
                    video.currentTime = rewindTime;
                    video.play();
                }
                activeQuestion = null;
            });
        }
    </script>
</body>
</html>`;
};

export default function App() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [newQuestionTime, setNewQuestionTime] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState<null | 'html' | 'zip'>(null);
    
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const playerRef = useRef<HTMLVideoElement>(null);

    const handleVideoSelect = (file: File) => {
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        setQuestions([]);
        setActiveQuestion(null);
        setSelectedQuestion(null);
        setNewQuestionTime(null);
        setCurrentTime(0);
        setDuration(0);
    };

    const handleSaveQuestion = (question: Question) => {
        setQuestions(prev => {
            const exists = prev.some(q => q.id === question.id);
            if (exists) {
                return prev.map(q => q.id === question.id ? question : q);
            }
            return [...prev, question];
        });
        setNewQuestionTime(null);
        setSelectedQuestion(null);
    };

    const handleSelectQuestion = (question: Question | null) => {
        setSelectedQuestion(question);
        setNewQuestionTime(null);
        if (question && playerRef.current) {
            playerRef.current.currentTime = question.time;
        }
    };

    const handleDeleteQuestion = (questionId: string) => {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        if(selectedQuestion?.id === questionId) {
            setSelectedQuestion(null);
        }
    };

    const handleTimelineClick = (time: number) => {
        setNewQuestionTime(time);
        setSelectedQuestion(null);
    };
    
    const handleQuestionTrigger = (question: Question) => {
        setActiveQuestion(question);
    };

    const handleQuestionResult = (isCorrect: boolean) => {
        if (!activeQuestion || !playerRef.current) return;
    
        const currentQuestionId = activeQuestion.id;
        
        setActiveQuestion(null);
    
        if (isCorrect) {
            if (playerRef.current.currentTime < activeQuestion.time + 0.5) {
                playerRef.current.currentTime = activeQuestion.time + 0.5;
            }
            playerRef.current.play();
        } else {
            const sortedQuestions = [...questions].sort((a, b) => a.time - b.time);
            const currentIndex = sortedQuestions.findIndex(q => q.id === currentQuestionId);
            const rewindTime = currentIndex > 0 ? sortedQuestions[currentIndex - 1].time : 0;
            playerRef.current.currentTime = rewindTime;
            playerRef.current.play();
        }
    };
    
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleExportHtml = async () => {
        if (!videoFile) {
            alert('Vui lòng tải lên một video trước khi xuất.');
            return;
        }
        
        setIsExporting('html');
        try {
            const videoDataUrl = await fileToBase64(videoFile);
            const questionsJson = JSON.stringify(questions);
            const htmlContent = generateHtmlContent(videoDataUrl, questionsJson, videoFile.type);

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'interactive_video.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Lỗi khi xuất file HTML:", error);
            alert("Đã có lỗi xảy ra trong quá trình xuất file.");
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportZip = async () => {
         if (!videoFile) {
            alert('Vui lòng tải lên một video trước khi xuất.');
            return;
        }
        setIsExporting('zip');
        try {
            const zip = new JSZip();
            const videoFileName = "video." + (videoFile.name.split('.').pop() || 'mp4');

            // Add video file
            zip.file(videoFileName, videoFile);
            
            // Create and add questions.js file
            const questionsJson = JSON.stringify(questions, null, 2);
            const questionsJsContent = `window.interactiveQuestions = ${questionsJson};`;
            zip.file("questions.js", questionsJsContent);

            // Create and add index.html
            const htmlContent = generatePackagedHtmlContent(videoFileName);
            zip.file("index.html", htmlContent);

            // Generate and download zip
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'interactive_video_package.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error("Lỗi khi xuất gói ZIP:", error);
            alert("Đã có lỗi xảy ra trong quá trình xuất gói ZIP.");
        } finally {
            setIsExporting(null);
        }
    };


    return (
        <div className="min-h-screen flex flex-col bg-slate-100">
            <Header />
            <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
                {!videoUrl ? (
                    <VideoUploader onVideoSelect={handleVideoSelect} />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                        <div className="lg:col-span-2 flex flex-col space-y-6">
                            <VideoPlayer
                                playerRef={playerRef}
                                videoUrl={videoUrl}
                                questions={questions}
                                onTimeUpdate={setCurrentTime}
                                onDurationChange={setDuration}
                                onTimelineClick={handleTimelineClick}
                                onQuestionTrigger={handleQuestionTrigger}
                                activeQuestion={activeQuestion}
                                onQuestionResult={handleQuestionResult}
                                currentTime={currentTime}
                            />
                            <div className="bg-white p-4 rounded-xl shadow-lg flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-700">Xuất sản phẩm</h3>
                                <div className="flex space-x-3">
                                    <button onClick={handleExportZip} disabled={!!isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400">
                                        <VideoIcon className="w-5 h-5 mr-2" />
                                        {isExporting === 'zip' ? 'Đang đóng gói...' : 'Xuất Gói Tương Tác (.zip)'}
                                    </button>
                                    <button onClick={handleExportHtml} disabled={!!isExporting} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400">
                                        <HtmlIcon className="w-5 h-5 mr-2" />
                                        {isExporting === 'html' ? 'Đang xuất...' : 'Xuất HTML Tương Tác'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 h-[80vh] min-h-[600px]">
                            <QuestionEditor
                                questions={questions}
                                onSaveQuestion={handleSaveQuestion}
                                onSelectQuestion={handleSelectQuestion}
                                onDeleteQuestion={handleDeleteQuestion}
                                selectedQuestion={selectedQuestion}
                                newQuestionTime={newQuestionTime}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
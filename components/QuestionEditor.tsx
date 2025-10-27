import React, { useState, useEffect } from 'react';
import type { Question, AnswerOption, MultipleChoiceQuestion, TrueFalseQuestion, OrderingQuestion } from '../types';
import { QuestionType } from '../types';
import { PlusIcon, TrashIcon, EditIcon, CheckCircleIcon, ListBulletIcon, CheckBadgeIcon, ArrowsUpDownIcon } from './Icons';

interface QuestionEditorProps {
    questions: Question[];
    onSaveQuestion: (question: Question) => void;
    onSelectQuestion: (question: Question | null) => void;
    onDeleteQuestion: (questionId: string) => void;
    selectedQuestion: Question | null;
    newQuestionTime: number | null;
}

const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const questionTypeDetails = {
    [QuestionType.MultipleChoice]: { name: 'Trắc nghiệm', Icon: ListBulletIcon, color: 'text-sky-600' },
    [QuestionType.TrueFalse]: { name: 'Đúng / Sai', Icon: CheckBadgeIcon, color: 'text-green-600' },
    [QuestionType.Ordering]: { name: 'Sắp xếp', Icon: ArrowsUpDownIcon, color: 'text-purple-600' },
};

const TypeSelector: React.FC<{selectedType: QuestionType, onSelect: (type: QuestionType) => void, disabled: boolean}> = ({selectedType, onSelect, disabled}) => (
    <div className="flex space-x-2 border border-slate-200 rounded-lg p-1 mb-4 bg-slate-50">
        {Object.values(QuestionType).map(type => (
            <button 
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(type)}
                className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm font-semibold transition-colors ${selectedType === type ? 'bg-white shadow text-sky-600' : 'text-slate-500 hover:bg-slate-100'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
                {React.createElement(questionTypeDetails[type].Icon, {className: `w-5 h-5 mr-2 ${questionTypeDetails[type].color}`})}
                {questionTypeDetails[type].name}
            </button>
        ))}
    </div>
)


export const QuestionEditor: React.FC<QuestionEditorProps> = ({ 
    questions, 
    onSaveQuestion,
    onSelectQuestion,
    onDeleteQuestion,
    selectedQuestion,
    newQuestionTime,
}) => {
    const [activeType, setActiveType] = useState<QuestionType>(QuestionType.MultipleChoice);
    const [questionText, setQuestionText] = useState('');
    
    // State for Multiple Choice
    const [mcOptions, setMcOptions] = useState<AnswerOption[]>([{ id: crypto.randomUUID(), text: '' }, { id: crypto.randomUUID(), text: '' }]);
    const [mcCorrect, setMcCorrect] = useState<string | null>(null);

    // State for True/False
    const [tfCorrect, setTfCorrect] = useState<'true' | 'false' | null>(null);

    // State for Ordering
    const [ordItems, setOrdItems] = useState<AnswerOption[]>([{ id: crypto.randomUUID(), text: '' }, { id: crypto.randomUUID(), text: '' }]);

    const isEditing = !!selectedQuestion;
    const isCreating = newQuestionTime !== null;
    const displayTime = isEditing ? selectedQuestion.time : newQuestionTime ?? 0;

    const resetForms = () => {
        setQuestionText('');
        setMcOptions([{ id: crypto.randomUUID(), text: '' }, { id: crypto.randomUUID(), text: '' }]);
        setMcCorrect(null);
        setTfCorrect(null);
        setOrdItems([{ id: crypto.randomUUID(), text: '' }, { id: crypto.randomUUID(), text: '' }]);
    }
    
    useEffect(() => {
        if (selectedQuestion) {
            setActiveType(selectedQuestion.type);
            setQuestionText(selectedQuestion.questionText);
            if (selectedQuestion.type === QuestionType.MultipleChoice) {
                setMcOptions(selectedQuestion.options);
                setMcCorrect(selectedQuestion.correctAnswerId);
            }
            if (selectedQuestion.type === QuestionType.TrueFalse) {
                setTfCorrect(selectedQuestion.correctAnswerId);
            }
            if (selectedQuestion.type === QuestionType.Ordering) {
                setOrdItems(selectedQuestion.items);
            }
        } else {
            resetForms();
            // Optional: reset active type when starting a new question
            // setActiveType(QuestionType.MultipleChoice);
        }
    }, [selectedQuestion]);
    
    useEffect(() => {
        if (newQuestionTime !== null) {
            resetForms();
        }
    }, [newQuestionTime])

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const timeToSave = isEditing ? selectedQuestion!.time : newQuestionTime;
        if (timeToSave === null) return;
        
        const baseProps = {
            id: isEditing ? selectedQuestion!.id : crypto.randomUUID(),
            time: timeToSave,
            questionText,
        };

        let questionToSave: Question | null = null;
        switch (activeType) {
            case QuestionType.MultipleChoice:
                questionToSave = { ...baseProps, type: QuestionType.MultipleChoice, options: mcOptions, correctAnswerId: mcCorrect };
                break;
            case QuestionType.TrueFalse:
                questionToSave = { ...baseProps, type: QuestionType.TrueFalse, correctAnswerId: tfCorrect };
                break;
            case QuestionType.Ordering:
                questionToSave = { ...baseProps, type: QuestionType.Ordering, items: ordItems };
                break;
        }

        if (questionToSave) {
            onSaveQuestion(questionToSave);
        }
        onSelectQuestion(null);
    };
    
    const handleDynamicOptionChange = (id: string, text: string, list: AnswerOption[], setList: React.Dispatch<React.SetStateAction<AnswerOption[]>>) => {
        setList(list.map(opt => opt.id === id ? { ...opt, text } : opt));
    };
    
    const addDynamicOption = (list: AnswerOption[], setList: React.Dispatch<React.SetStateAction<AnswerOption[]>>) => {
        if(list.length < 5) {
            setList([...list, { id: crypto.randomUUID(), text: '' }]);
        }
    };
    
    const removeDynamicOption = (id: string, list: AnswerOption[], setList: React.Dispatch<React.SetStateAction<AnswerOption[]>>, setCorrect?: React.Dispatch<React.SetStateAction<string|null>>) => {
        if (list.length > 2) {
            setList(list.filter(opt => opt.id !== id));
            if (setCorrect && mcCorrect === id) {
                setCorrect(null);
            }
        }
    };

    const isSaveDisabled = () => {
        if (!isEditing && !isCreating) return true;
        if (!questionText.trim()) return true;
        if (activeType === QuestionType.MultipleChoice && (mcCorrect === null || mcOptions.some(o => !o.text.trim()))) return true;
        if (activeType === QuestionType.TrueFalse && tfCorrect === null) return true;
        if (activeType === QuestionType.Ordering && (ordItems.length < 2 || ordItems.some(i => !i.text.trim()))) return true;
        return false;
    }

    const sortedQuestions = [...questions].sort((a,b) => a.time - b.time);

    return (
        <div className="w-full h-full bg-white rounded-xl shadow-lg p-6 flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Câu hỏi tương tác</h2>
            
            <div className="flex-grow overflow-y-auto mb-4 pr-2">
                {sortedQuestions.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Chưa có câu hỏi nào. Nhấp vào dòng thời gian của video để bắt đầu!</p>
                ) : (
                    <ul className="space-y-2">
                        {sortedQuestions.map(q => (
                            <li key={q.id} className={`p-3 rounded-lg flex items-center justify-between transition-colors ${selectedQuestion?.id === q.id ? 'bg-sky-100' : 'bg-slate-50'}`}>
                                <div className="flex items-center overflow-hidden">
                                    {React.createElement(questionTypeDetails[q.type].Icon, { className: `w-5 h-5 mr-3 flex-shrink-0 ${questionTypeDetails[q.type].color}`})}
                                    <div>
                                        <span className="font-bold text-sky-700 bg-sky-200 px-2 py-1 rounded-md text-sm">{formatTime(q.time)}</span>
                                        <p className="text-slate-700 font-medium ml-3 inline truncate">{q.questionText || "Câu hỏi chưa có nội dung"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                    <button onClick={() => onSelectQuestion(q)} className="text-slate-500 hover:text-sky-600"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => onDeleteQuestion(q.id)} className="text-slate-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {(isEditing || isCreating) &&
            <form onSubmit={handleSave} className="border-t border-slate-200 pt-4">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">{isEditing ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'} tại <span className="text-orange-500 font-bold">{formatTime(displayTime)}</span></h3>
                <TypeSelector selectedType={activeType} onSelect={setActiveType} disabled={isEditing} />
                <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Nhập nội dung câu hỏi..."
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition"
                    rows={3}
                    required
                />

                {/* Multiple Choice Form */}
                {activeType === QuestionType.MultipleChoice && <div className="my-3 space-y-2">
                    <label className="font-semibold text-slate-600">Các đáp án:</label>
                    {mcOptions.map((opt, index) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                            <button type="button" onClick={() => setMcCorrect(opt.id)} className={`p-1 rounded-full ${mcCorrect === opt.id ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`}><CheckCircleIcon className="w-6 h-6"/></button>
                            <input type="text" value={opt.text} onChange={(e) => handleDynamicOptionChange(opt.id, e.target.value, mcOptions, setMcOptions)} placeholder={`Đáp án ${index + 1}`} className="flex-grow p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-400" required/>
                            <button type="button" onClick={() => removeDynamicOption(opt.id, mcOptions, setMcOptions, setMcCorrect)} disabled={mcOptions.length <= 2} className="text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    ))}
                    {mcOptions.length < 5 && <button type="button" onClick={() => addDynamicOption(mcOptions, setMcOptions)} className="text-sm text-sky-600 hover:text-sky-800 font-semibold flex items-center"><PlusIcon className="w-4 h-4 mr-1"/> Thêm đáp án</button>}
                </div>}
                
                {/* True/False Form */}
                {activeType === QuestionType.TrueFalse && <div className="my-3 space-y-2">
                    <label className="font-semibold text-slate-600">Đáp án đúng:</label>
                    <div className='flex space-x-4'>
                        <label className='flex items-center cursor-pointer'><input type="radio" name="tf-correct" checked={tfCorrect === 'true'} onChange={() => setTfCorrect('true')} className="mr-2 h-4 w-4 accent-sky-500" /> Đúng</label>
                        <label className='flex items-center cursor-pointer'><input type="radio" name="tf-correct" checked={tfCorrect === 'false'} onChange={() => setTfCorrect('false')} className="mr-2 h-4 w-4 accent-sky-500" /> Sai</label>
                    </div>
                </div>}

                {/* Ordering Form */}
                {activeType === QuestionType.Ordering && <div className="my-3 space-y-2">
                    <label className="font-semibold text-slate-600">Các mục (nhập theo đúng thứ tự):</label>
                    {ordItems.map((opt, index) => (
                        <div key={opt.id} className="flex items-center space-x-2">
                            <span className="font-bold text-slate-400 w-6 text-center">{index + 1}.</span>
                            <input type="text" value={opt.text} onChange={(e) => handleDynamicOptionChange(opt.id, e.target.value, ordItems, setOrdItems)} placeholder={`Mục ${index + 1}`} className="flex-grow p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-400" required/>
                            <button type="button" onClick={() => removeDynamicOption(opt.id, ordItems, setOrdItems)} disabled={ordItems.length <= 2} className="text-slate-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    ))}
                    {ordItems.length < 5 && <button type="button" onClick={() => addDynamicOption(ordItems, setOrdItems)} className="text-sm text-sky-600 hover:text-sky-800 font-semibold flex items-center"><PlusIcon className="w-4 h-4 mr-1"/> Thêm mục</button>}
                </div>}
                
                 <div className="mt-4 flex justify-end space-x-2">
                    <button type="button" onClick={() => onSelectQuestion(null)} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors">Hủy</button>
                    <button type="submit" className="px-4 py-2 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={isSaveDisabled()}>
                        {isEditing ? 'Lưu thay đổi' : 'Lưu câu hỏi'}
                    </button>
                </div>
            </form>
            }
        </div>
    );
};

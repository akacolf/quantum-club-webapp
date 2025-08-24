// TaskContext.js
'use client';
import { TaskHistory } from '@/lib/interfaces';
import React, { createContext, useContext, useState } from 'react';

const TaskContext = createContext<{ tasks: TaskHistory[]; setTasks: React.Dispatch<React.SetStateAction<TaskHistory[]>> } | undefined>(undefined);

export const useTasks = () => {
    return useContext(TaskContext);
};

export const TaskProvider = ({ children } : { children: React.ReactNode }) => {
    const [tasks, setTasks] = useState<Array<TaskHistory>>([]);

    return (
        <TaskContext.Provider value={{ tasks, setTasks }}>
            {children}
        </TaskContext.Provider>
    );
};

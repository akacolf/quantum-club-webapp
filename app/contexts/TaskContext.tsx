// TaskContext.js
'use client';
import React, { createContext, useContext, useState } from 'react';

const TaskContext = createContext<{ tasks: any[]; setTasks: React.Dispatch<React.SetStateAction<any[]>> } | undefined>(undefined);

export const useTasks = () => {
    return useContext(TaskContext);
};

export const TaskProvider = ({ children } : { children: React.ReactNode }) => {
    const [tasks, setTasks] = useState([]);

    return (
        <TaskContext.Provider value={{ tasks, setTasks }}>
            {children}
        </TaskContext.Provider>
    );
};

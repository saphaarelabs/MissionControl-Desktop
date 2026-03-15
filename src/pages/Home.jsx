import React from 'react';
import KanbanBoard from '../components/KanbanBoard';

const Home = () => {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <main className="min-w-0 min-h-0 flex-1 overflow-hidden">
                <KanbanBoard />
            </main>
        </div>
    );
};

export default Home;

import React from 'react';
import BellIcon from './icons/BellIcon';
import UserIcon from './icons/UserIcon';
import LogOutIcon from './icons/LogOutIcon';
import { User } from '../types';

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white border-b border-zinc-200 h-20 px-8 flex justify-between items-center z-10 flex-shrink-0">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Welcome, {user?.name.split(' ')[0] || 'User'}</h1>
        <p className="text-sm text-zinc-500">Here's a look at today's operational status.</p>
      </div>
      <div className="flex items-center space-x-6">
        <button className="relative text-zinc-500 hover:text-sky-500 transition-colors">
          <BellIcon className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
          </span>
        </button>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-zinc-200 border-2 border-zinc-300 flex items-center justify-center">
             <UserIcon className="w-6 h-6 text-zinc-500" />
          </div>
          <div>
            <div className="font-semibold text-zinc-800 text-sm">{user?.name}</div>
            <div className="text-xs text-zinc-500">{user?.role}</div>
          </div>
        </div>
         <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-zinc-500 hover:text-sky-500 transition-colors"
            title="Logout"
        >
            <LogOutIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;

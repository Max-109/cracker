import { SquarePen, User } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  return (
    <div className="w-[260px] bg-[var(--bg-sidebar)] h-full hidden md:flex flex-col p-3 border-r border-transparent">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#424242] scrollbar-track-transparent">
         <button 
            onClick={onNewChat}
            className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-sm font-medium text-[var(--text-primary)] w-full text-left mb-4"
          >
            <SquarePen size={18} strokeWidth={2} />
            <span>New Chat</span>
        </button>

        <div className="text-xs font-medium text-[var(--text-secondary)] px-2 py-2 mt-4">Today</div>
        {/* Dummy History */}
        <div className="px-2 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer truncate transition-colors">
          React Component Help
        </div>
        <div className="px-2 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer truncate transition-colors">
          Next.js App Router
        </div>
        <div className="px-2 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer truncate transition-colors">
          Tailwind CSS Styling
        </div>
      </div>
      
      {/* User Profile Section */}
      <div className="mt-auto pt-2 border-t border-[#2F2F2F]">
        <button className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-[var(--bg-hover)] w-full text-left transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-semibold text-xs">
            JD
          </div>
          <div className="flex flex-col text-sm">
            <span className="text-[var(--text-primary)] font-medium">John Doe</span>
            <span className="text-[var(--text-secondary)] text-xs">Free Plan</span>
          </div>
        </button>
      </div>
    </div>
  );
}

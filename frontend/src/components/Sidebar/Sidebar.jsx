import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PanelLeftClose, PanelLeft, Plus, MessageSquare, Trash2, LogOut, Settings, MessageSquareDashed, Search, ChevronDown, MoreHorizontal, Pencil } from 'lucide-react';

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onOpenSettings,
  sidebarOpen,
  onCloseSidebar,
  onToggleSidebar,
}) {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Options menu, rename, and delete confirmation states
  const [activeMenuChatId, setActiveMenuChatId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState(null);

  const handleChatClick = (chatId) => {
    if (chatId !== activeChatId) onSelectChat(chatId);
    if (window.innerWidth < 768) onCloseSidebar();
  };

  const handleRenameSave = async (chatId) => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== chats.find(c => c.id === chatId)?.title) {
      await onRenameChat?.(chatId, trimmed);
    }
    setEditingChatId(null);
  };

  const handleRenameKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      handleRenameSave(chatId);
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  // Client-side search filtering
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // P0: Dynamic time-based grouping of conversation history
  const groupChatsByTime = (chatsList) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const groups = {
      today: [],
      yesterday: [],
      week: [],
      month: [],
      older: [],
    };

    chatsList.forEach((chat) => {
      const time = typeof chat.updatedAt === 'number'
        ? chat.updatedAt
        : chat.updatedAt?.toMillis?.() || Date.now();

      const diff = now - time;

      if (diff < oneDay) {
        groups.today.push(chat);
      } else if (diff < 2 * oneDay) {
        groups.yesterday.push(chat);
      } else if (diff < 7 * oneDay) {
        groups.week.push(chat);
      } else if (diff < 30 * oneDay) {
        groups.month.push(chat);
      } else {
        groups.older.push(chat);
      }
    });

    return [
      { label: 'Today', chats: groups.today },
      { label: 'Yesterday', chats: groups.yesterday },
      { label: 'Previous 7 Days', chats: groups.week },
      { label: 'Previous 30 Days', chats: groups.month },
      { label: 'Older', chats: groups.older },
    ].filter((group) => group.chats.length > 0);
  };

  const groupedGroups = groupChatsByTime(filteredChats);

  return (
    <>
      <aside id="sidebar" className={sidebarOpen ? 'sidebar--open' : ''} role="navigation" aria-label="Chat history">
        {/* Header */}
        <div className="sidebar__header">
          <img src="/logo.svg" alt="NexChat logo" className="sidebar__logo" width="36" height="36" />
          <span className="sidebar__brand">NexChat</span>
          <button className="sidebar__collapse-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar" title="Toggle sidebar (Ctrl+B)">
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* P0: Compact New Chat button */}
        <button className="new-chat-btn" onClick={onNewChat} aria-label="New chat (Ctrl+N)" title="New chat (Ctrl+N)">
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        {/* P0: Search input directly below New Chat */}
        <div 
          className="sidebar__search"
          onClick={() => {
            if (!sidebarOpen) onToggleSidebar();
          }}
        >
          <Search size={14} className="sidebar__search-icon" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!sidebarOpen}
          />
        </div>



        {/* Chat list */}
        <div id="chat-list" role="list" aria-label="Conversation history">
          {chats.length === 0 ? (
            <div className="sidebar-empty-state">
              <MessageSquareDashed size={28} className="sidebar-empty-state__icon" />
              <span className="sidebar-empty-state__text">Your chats will appear here</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="sidebar-empty-state">
              <span className="sidebar-empty-state__text">No results found</span>
            </div>
          ) : (
            groupedGroups.map((group) => (
              <div key={group.label} className="sidebar__group">
                <div className="sidebar__group-label">{group.label}</div>
                {group.chats.map((chat) => (
                  editingChatId === chat.id ? (
                    <div 
                      key={chat.id} 
                      className="chat-item chat-item--editing" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="chat-item__icon">
                        <MessageSquare size={14} />
                      </div>
                      <input
                        className="chat-item__edit-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRenameSave(chat.id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  ) : (
                    <div
                      key={chat.id}
                      className={`chat-item ${chat.id === activeChatId ? 'chat-item--active' : ''}`}
                      role="button"
                      tabIndex={0}
                      title={chat.title}
                      onClick={() => handleChatClick(chat.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleChatClick(chat.id); }}
                    >
                      <div className="chat-item__icon">
                        <MessageSquare size={14} />
                      </div>
                      <span className="chat-item__title">{chat.title}</span>
                      
                      {sidebarOpen && (
                        <button
                          className="chat-item__menu-btn"
                          title="Chat options"
                          aria-label="Chat options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuChatId(activeMenuChatId === chat.id ? null : chat.id);
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      )}

                      {sidebarOpen && activeMenuChatId === chat.id && (
                        <>
                          <div 
                            className="chat-item__dropdown-backdrop" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuChatId(null);
                            }}
                          />
                          <div className="chat-item__dropdown" onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="chat-item__dropdown-item" 
                              onClick={() => {
                                setEditingChatId(chat.id);
                                setEditTitle(chat.title);
                                setActiveMenuChatId(null);
                              }}
                            >
                              <Pencil size={13} />
                              <span>Rename</span>
                            </button>
                            <button 
                              className="chat-item__dropdown-item chat-item__dropdown-item--delete" 
                              onClick={() => {
                                setDeleteConfirmChatId(chat.id);
                                setActiveMenuChatId(null);
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sidebar__footer">
          {/* User Profile */}
          {user && (
            <div className="sidebar__user">
              <div className="sidebar__user-avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" width="28" height="28" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              <span className="sidebar__user-name">{user.displayName || user.email}</span>
              {/* P1: Dropdown visual chevron indicator */}
              <ChevronDown size={14} className="sidebar__user-chevron" />
              
              <button className="sidebar__logout-btn" onClick={signOut} title="Log out" aria-label="Log out">
                <LogOut size={14} />
              </button>
            </div>
          )}

          <button id="settings-btn" onClick={onOpenSettings} aria-label="Open settings">
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {deleteConfirmChatId && (
        <div className="delete-confirm-overlay" onClick={() => setDeleteConfirmChatId(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-modal__title">Delete chat?</div>
            <div className="delete-confirm-modal__body">This can't be undone.</div>
            <div className="delete-confirm-modal__actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirmChatId(null)}>Cancel</button>
              <button 
                className="btn-delete" 
                onClick={async () => {
                  await onDeleteChat(deleteConfirmChatId);
                  setDeleteConfirmChatId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      <div
        id="sidebar-overlay"
        className={sidebarOpen ? 'overlay--visible' : ''}
        aria-hidden="true"
        onClick={onCloseSidebar}
      />
    </>
  );
}


import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { WorkflowComment, User } from '../types';

interface CommentSectionProps {
  workflowId: string;
  user: User;
}

const CommentSection: React.FC<CommentSectionProps> = ({ workflowId, user }) => {
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('en_workflow_comments')
        .select(`id, comment_text, created_at, user:en_users(name)`)
        .eq('workflow_request_id', workflowId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as any) || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('en_workflow_comments')
        .insert({
            workflow_request_id: workflowId,
            user_id: user.id,
            comment_text: newComment.trim(),
        });
        
      if (error) throw error;
      setNewComment('');
      fetchComments(); // Refresh comments list
    } catch (err) {
      alert('Failed to post comment.');
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
        {loading && <p className="text-sm text-zinc-500">Loading comments...</p>}
        {!loading && comments.length === 0 && <p className="text-sm text-zinc-500">No comments yet.</p>}
        {comments.map(comment => (
          <div key={comment.id} className="text-sm">
            <p className="text-zinc-700 bg-zinc-100 p-3 rounded-lg rounded-bl-none">{comment.comment_text}</p>
            <div className="text-xs text-zinc-400 mt-1 pl-1">
              <strong>{comment.user?.name || 'Unknown User'}</strong> &mdash; {new Date(comment.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handlePostComment} className="flex items-start space-x-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1 p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900"
          disabled={isPosting}
        />
        <button
          type="submit"
          disabled={isPosting || !newComment.trim()}
          className="px-4 py-2 bg-zinc-200 text-zinc-800 font-semibold rounded-md hover:bg-zinc-300 disabled:bg-zinc-100 disabled:cursor-not-allowed transition-colors"
        >
          {isPosting ? '...' : 'Post'}
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
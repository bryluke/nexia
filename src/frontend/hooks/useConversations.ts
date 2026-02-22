import { useState, useCallback } from "preact/hooks";
import type { Conversation } from "../types.ts";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function useConversations(token: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        headers: authHeaders(token),
      });
      if (res.ok) {
        setConversations(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createConversation = useCallback(async (): Promise<Conversation | null> => {
    if (!token) return null;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    const conv: Conversation = await res.json();
    setConversations((prev) => [conv, ...prev]);
    return conv;
  }, [token]);

  const deleteConversation = useCallback(async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/conversations/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
    }
  }, [token]);

  const updateConversationInList = useCallback((updated: Partial<Conversation> & { id: string }) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  }, []);

  return {
    conversations,
    loading,
    fetchConversations,
    createConversation,
    deleteConversation,
    updateConversationInList,
  };
}

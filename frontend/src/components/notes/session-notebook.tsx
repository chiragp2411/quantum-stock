"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  Loader2,
  Lightbulb,
  AlertTriangle,
  Target,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface Note {
  _id: string;
  stock_symbol: string;
  note_type: string;
  content: string;
  quarter: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string;
}

const NOTE_TYPES = [
  { value: "thesis", label: "Investment Thesis", icon: Target, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { value: "observation", label: "Observation", icon: Lightbulb, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { value: "switch_trigger", label: "Switch Trigger", icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "quarterly_update", label: "Quarterly Update", icon: FileText, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
];

interface SessionNotebookProps {
  symbol: string;
}

export function SessionNotebook({ symbol }: SessionNotebookProps) {
  const { isAuthenticated } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState("thesis");
  const [newContent, setNewContent] = useState("");
  const [newQuarter, setNewQuarter] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const loadNotes = useCallback(async () => {
    try {
      const res = await api.get(`/api/notes/${encodeURIComponent(symbol)}`);
      setNotes(res.data);
    } catch {
      // no notes yet
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadNotes();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/notes/${encodeURIComponent(symbol)}`, {
        note_type: newType,
        content: newContent.trim(),
        quarter: newQuarter || null,
      });
      toast.success("Note saved");
      setNewContent("");
      setNewQuarter("");
      setShowForm(false);
      loadNotes();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (noteId: string) => {
    setSaving(true);
    try {
      await api.put(`/api/notes/${encodeURIComponent(symbol)}/${noteId}`, {
        content: editContent.trim(),
      });
      toast.success("Note updated");
      setEditingId(null);
      loadNotes();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await api.delete(`/api/notes/${encodeURIComponent(symbol)}/${noteId}`);
      toast.success("Note deleted");
      loadNotes();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-purple-400" />
              Session Notebook
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Track your thesis, observations, and switch triggers for this stock
            </CardDescription>
          </div>
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-3 w-3" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
            <div className="flex gap-3">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-48 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="text"
                placeholder="Quarter (optional, e.g. Q3FY26)"
                value={newQuarter}
                onChange={(e) => setNewQuarter(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-xs"
              />
            </div>
            <Textarea
              placeholder="Write your thesis, observation, or switch trigger..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[100px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 gap-1.5"
                onClick={handleCreate}
                disabled={saving || !newContent.trim()}
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                <Save className="h-3 w-3" />
                Save
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/60">
              {isAuthenticated ? "No notes yet. Add your first investment thesis." : "Sign in to add notes."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const typeConfig = NOTE_TYPES.find((t) => t.value === note.note_type) || NOTE_TYPES[1];
              const Icon = typeConfig.icon;
              const isEditing = editingId === note._id;

              return (
                <div key={note._id} className="group rounded-lg border border-border/30 bg-card/50 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] gap-1 ${typeConfig.color}`}>
                        <Icon className="h-3 w-3" />
                        {typeConfig.label}
                      </Badge>
                      {note.quarter && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {note.quarter}
                        </Badge>
                      )}
                    </div>
                    {isAuthenticated && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            if (isEditing) {
                              setEditingId(null);
                            } else {
                              setEditingId(note._id);
                              setEditContent(note.content);
                            }
                          }}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(note._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px] text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500"
                          onClick={() => handleUpdate(note._id)}
                          disabled={saving}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/40 mt-2">
                    {new Date(note.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {note.updated_at && " (edited)"}
                    {" · "}{note.created_by}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

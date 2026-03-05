import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Share2, Lock, Unlock, Edit2, Save } from "lucide-react";
import { ServerCollection } from "@/src/types";
import { cn } from "@/src/lib/utils";

interface ServerCollectionsProps {
  token: string | null;
}

export default function ServerCollections({ token }: ServerCollectionsProps) {
  const [collections, setCollections] = React.useState<ServerCollection[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState("");
  const [newCollectionDesc, setNewCollectionDesc] = React.useState("");
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const fetchCollections = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/collections", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCollections();
  }, [token]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !token) return;

    try {
      const res = await fetch("/api/user/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDesc
        })
      });

      if (res.ok) {
        setNewCollectionName("");
        setNewCollectionDesc("");
        setShowCreate(false);
        fetchCollections();
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  };

  const handleDeleteCollection = async (collectionId: number) => {
    if (!confirm("Delete this collection?") || !token) return;

    try {
      await fetch(`/api/user/collections/${collectionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchCollections();
    } catch (err) {
      console.error("Failed to delete collection:", err);
    }
  };

  const handleToggleShare = async (collectionId: number, isShared: boolean) => {
    if (!token) return;

    try {
      await fetch(`/api/user/collections/${collectionId}/share`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ is_shared: !isShared })
      });
      fetchCollections();
    } catch (err) {
      console.error("Failed to update sharing:", err);
    }
  };

  if (!token) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
        <Lock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-500 font-bold">Please login to manage collections</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Server Collections</h2>
          <p className="text-zinc-500 text-sm">Create and manage your custom server lists</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Collection
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 overflow-hidden"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Collection Name</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. Favorite RP Servers"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Description (Optional)</label>
                <textarea
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder="Describe this collection..."
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateCollection}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                >
                  Create Collection
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : collections.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
          <p className="text-zinc-500">No collections yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <motion.div
              key={collection.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{collection.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleToggleShare(collection.id, collection.is_shared)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    collection.is_shared
                      ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                      : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                  )}
                  title={collection.is_shared ? "Publicly shared" : "Private"}
                >
                  {collection.is_shared ? (
                    <Unlock className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {collection.servers_ids.length} Server{collection.servers_ids.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(collection.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-indigo-600/20 text-zinc-300 hover:text-indigo-400 font-bold text-xs rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (collection.shared_token) {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/collection/${collection.shared_token}`
                      );
                    }
                  }}
                  disabled={!collection.is_shared}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 font-bold text-xs rounded-lg transition-colors",
                    collection.is_shared
                      ? "bg-zinc-800 hover:bg-emerald-600/20 text-zinc-300 hover:text-emerald-400"
                      : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                  )}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={() => handleDeleteCollection(collection.id)}
                  className="px-3 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-bold text-xs rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

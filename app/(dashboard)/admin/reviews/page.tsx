"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";
import { Plus, MessageSquare, Upload, Image as ImageIcon, X } from "lucide-react";
import ReviewsTable from "@/components/admin/ReviewsTable";
import { CldUploadWidget } from "next-cloudinary";

interface Review {
  id: string;
  authorName: string;
  authorImage: string | null;
  rating: number;
  content: string;
  tripType: string | null;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminReviewsPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    authorName: "",
    authorImage: "",
    rating: "5",
    content: "",
    tripType: "",
    isApproved: false,
  });

  useEffect(() => {
    if (session && session.user?.role !== "ADMIN") {
      redirect("/");
    }
  }, [session]);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews");
      const data = await response.json();
      if (Array.isArray(data)) {
        setReviews(data);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateImageUrl = (url: string) => {
    if (!url) return true;
    const allowedDomains = ["imgur.com", "cloudinary.com", "unsplash.com"];
    try {
      const parsedUrl = new URL(url);
      return allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!formData.authorName || !formData.content || !formData.rating) {
      alert("Please fill in all required fields (Name, Content, Rating)");
      return;
    }

    if (formData.authorImage && !validateImageUrl(formData.authorImage)) {
      alert("Invalid image URL. Only imgur.com, cloudinary.com, and unsplash.com are allowed.");
      return;
    }

    try {
      const url = editingId ? `/api/reviews/${editingId}` : "/api/reviews";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchReviews();
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save review:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/reviews/${deleteId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchReviews();
        setDeleteDialogOpen(false);
        setDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
    }
  };

  const handleToggleApproval = async (review: Review) => {
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !review.isApproved }),
      });
      if (response.ok) {
        await fetchReviews();
      }
    } catch (error) {
      console.error("Failed to toggle approval:", error);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setFormData({
      authorName: review.authorName,
      authorImage: review.authorImage || "",
      rating: review.rating.toString(),
      content: review.content,
      tripType: review.tripType || "",
      isApproved: review.isApproved,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      authorName: "",
      authorImage: "",
      rating: "5",
      content: "",
      tripType: "",
      isApproved: false,
    });
    setEditingId(null);
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-taxi-gold/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-taxi-gold" />
          </div>
          <h1 className="text-3xl font-bold bg-taxi-gold-gradient-left bg-clip-text text-transparent">
            Customer Reviews
          </h1>
        </div>
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="gap-2 bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20"
        >
          <Plus className="w-5 h-5" />
          Add Review
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center mt-2 mb-3 md:hidden select-none">
        ← Scroll left/right to see all →
      </p>

      <ReviewsTable
        reviews={reviews}
        onEdit={handleEdit}
        onDelete={(id) => { setDeleteId(id); setDeleteDialogOpen(true); }}
        onToggleApproval={handleToggleApproval}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? "Edit Review" : "Add New Review"}
        onConfirm={handleSubmit}
        confirmText={editingId ? "Update" : "Create"}
      >
        <div className="space-y-4 p-1">
          <Input
            label="Author Name*"
            placeholder="e.g. John Doe"
            value={formData.authorName}
            onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Author Image (Cloudinary or Direct URL)</label>
            <div className="flex flex-col gap-4">
              <Input
                placeholder="https://imgur.com/..."
                value={formData.authorImage}
                onChange={(e) => setFormData({ ...formData, authorImage: e.target.value })}
              />
              <CldUploadWidget
                uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                onSuccess={(result: any) => {
                  if (result.info?.secure_url) {
                    setFormData({ ...formData, authorImage: result.info.secure_url });
                  }
                }}
              >
                {(widget) => (
                  <div className="flex items-center gap-4">
                    {formData.authorImage && (formData.authorImage.startsWith('http') || formData.authorImage.startsWith('/')) ? (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 group">
                        <img src={formData.authorImage} alt="Author" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, authorImage: "" })}
                            className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <Button
                      type="button"
                      onClick={() => widget?.open?.()}
                      variant="ghost"
                      className="flex-1 gap-2 bg-white/10 border border-white/10 text-taxi-gold hover:bg-white/20 hover:border-taxi-gold/30 h-12 rounded-xl border-dashed transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Upload via Cloudinary
                    </Button>
                  </div>
                )}
              </CldUploadWidget>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rating (1-5)*"
              type="number"
              min="1"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              required
            />
            <Input
              label="Trip Type"
              placeholder="e.g. Airport Transfer"
              value={formData.tripType}
              onChange={(e) => setFormData({ ...formData, tripType: e.target.value })}
            />
          </div>
          <Textarea
            label="Review Content*"
            placeholder="Write the review here..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={5}
            required
          />
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <input
              type="checkbox"
              id="isApproved"
              checked={formData.isApproved}
              onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-taxi-gold focus:ring-taxi-gold/50"
            />
            <label htmlFor="isApproved" className="text-sm font-medium text-white/90 cursor-pointer">
              Approve immediately and show on website
            </label>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
}

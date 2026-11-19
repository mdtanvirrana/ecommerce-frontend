"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Edit,
  ExternalLink,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import { cn, formatDate } from "@/lib/utils";
import { adminReviewFormSchema } from "@/schemas";
import type { Review } from "@/types/api";
import type { z } from "zod";

type ReviewEditInput = z.input<typeof adminReviewFormSchema>;
type ReviewEditValues = z.output<typeof adminReviewFormSchema>;

const RATING_FILTER_OPTIONS: Record<string, string> = {
  all: "All Ratings",
  "5": "5 Stars",
  "4": "4 Stars",
  "3": "3 Stars",
  "2": "2 Stars",
  "1": "1 Star",
};

const STATUS_FILTER_OPTIONS: Record<string, string> = {
  all: "All Statuses",
  approved: "Approved",
  pending: "Hidden / Pending",
  featured: "Featured on Homepage",
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= rating ? "fill-[#FFC633] text-[#FFC633]" : "text-muted-foreground/30",
          )}
        />
      ))}
      <span className="ml-1 text-xs font-semibold">{rating}.0</span>
    </div>
  );
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [editing, setEditing] = useState<Review | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = hasPermission("reviews.manage");
  const canDelete = hasPermission("reviews.delete");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", debouncedSearch, ratingFilter, statusFilter, page],
    queryFn: () =>
      adminApi.getReviews({
        search: debouncedSearch || undefined,
        rating: ratingFilter === "all" ? undefined : Number(ratingFilter),
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        per_page: 15,
      }),
  });

  const payload = data?.data;
  const reviews = payload?.reviews ?? [];
  const summary = payload?.summary;
  const meta = data?.meta;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReviewEditInput, unknown, ReviewEditValues>({
    resolver: zodResolver(adminReviewFormSchema),
    defaultValues: {
      rating: 5,
      comment: "",
      is_approved: true,
      is_featured: false,
    },
  });

  const watchedRating = Number(watch("rating") ?? 5);

  const quickToggleMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<{ is_approved: boolean; is_featured: boolean }>;
    }) => adminApi.updateReview(id, patch),
    onSuccess: () => {
      toast.success("Review updated and product rating synced.");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["home-featured-reviews"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Failed to update review."));
    },
  });

  const openEdit = (rev: Review) => {
    setEditing(rev);
    reset({
      rating: rev.rating,
      comment: rev.comment,
      is_approved: rev.is_approved,
      is_featured: rev.is_featured,
    });
  };

  const onSubmitEdit = async (values: ReviewEditValues) => {
    if (!editing) return;
    try {
      await adminApi.updateReview(editing.id, values);
      toast.success("Review updated and product average rating recalculated.");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["home-featured-reviews"] });
    } catch (err) {
      applyApiErrorsToForm(err, setError, ["rating", "comment", "is_approved", "is_featured"]);
      toast.error(getApiErrorMessage(err, "Failed to update review."));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteReview(deleteTarget.id);
      toast.success("Review deleted and product rating updated.");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["home-featured-reviews"] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete review."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews &amp; Ratings</h1>
        <p className="text-sm text-muted-foreground">
          Moderate customer reviews, control storefront approval, and feature testimonials on the
          Homepage carousel.
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-medium">Total Reviews</CardDescription>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.total_reviews ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across all catalog products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-medium">Average Rating</CardDescription>
            <Star className="h-4 w-4 fill-[#FFC633] text-[#FFC633]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Number(summary?.average_rating ?? 0).toFixed(2)} / 5
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Approved storefront average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-medium">Approved</CardDescription>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.approved_reviews ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Visible on product pages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="font-medium">Featured on Home</CardDescription>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.featured_reviews ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Shown in customer carousel</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search reviewer, product, comment..."
            className="pl-9 h-9"
          />
        </div>

        <Select
          value={ratingFilter}
          items={RATING_FILTER_OPTIONS}
          onValueChange={(value) => {
            setRatingFilter(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by rating" className="h-9 min-w-[140px]">
            <SelectValue>{RATING_FILTER_OPTIONS[ratingFilter] ?? "All Ratings"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RATING_FILTER_OPTIONS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          items={STATUS_FILTER_OPTIONS}
          onValueChange={(value) => {
            setStatusFilter(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by moderation status" className="h-9 min-w-[180px]">
            <SelectValue>{STATUS_FILTER_OPTIONS[statusFilter] ?? "All Statuses"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_FILTER_OPTIONS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Date</TableHead>
                  {(canManage || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No matching reviews found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((rev) => (
                    <TableRow key={rev.id}>
                      <TableCell>
                        {rev.product ? (
                          <Link
                            href={`/products/${rev.product.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 font-medium hover:underline max-w-[180px]"
                          >
                            <span className="truncate">{rev.product.name}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{rev.reviewer_name}</span>
                          {rev.is_verified_purchase && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300"
                            >
                              Verified
                            </Badge>
                          )}
                        </div>
                        {rev.product?.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {rev.product.sku}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StarDisplay rating={rev.rating} />
                      </TableCell>
                      <TableCell className="max-w-[280px] whitespace-normal">
                        <p className="line-clamp-2 text-xs text-muted-foreground">{rev.comment}</p>
                      </TableCell>
                      <TableCell>
                        <Switch
                          aria-label={`Toggle approved for review ${rev.id}`}
                          disabled={!canManage || quickToggleMutation.isPending}
                          checked={rev.is_approved}
                          onCheckedChange={(checked) =>
                            quickToggleMutation.mutate({
                              id: rev.id,
                              patch: { is_approved: checked },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          aria-label={`Toggle featured for review ${rev.id}`}
                          disabled={!canManage || quickToggleMutation.isPending}
                          checked={rev.is_featured}
                          onCheckedChange={(checked) =>
                            quickToggleMutation.mutate({
                              id: rev.id,
                              patch: { is_featured: checked },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(rev.created_at)}
                      </TableCell>
                      {(canManage || canDelete) && (
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit review"
                                onClick={() => openEdit(rev)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete review"
                                onClick={() => setDeleteTarget(rev)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {meta.current_page} of {meta.last_page} ({meta.total} reviews)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Review Dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Review — {editing?.reviewer_name}</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rating *</Label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Set rating to ${star}`}
                    onClick={() => setValue("rating", star, { shouldValidate: true })}
                    className="rounded-md p-1 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6",
                        star <= watchedRating
                          ? "fill-[#FFC633] text-[#FFC633]"
                          : "text-muted-foreground/30",
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium">{watchedRating}/5</span>
              </div>
              {errors.rating && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.rating.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-review-comment">Comment *</Label>
              <Textarea
                id="admin-review-comment"
                rows={4}
                aria-invalid={Boolean(errors.comment)}
                {...register("comment")}
              />
              {errors.comment && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {errors.comment.message}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <Controller
                name="is_approved"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    Approved on Storefront
                  </label>
                )}
              />
              <Controller
                name="is_featured"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    Featured on Homepage
                  </label>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Review?"
        description={`Permanently delete review by "${deleteTarget?.reviewer_name}"? The product's average rating and review count will recalculate automatically.`}
        confirmLabel="Delete Review"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

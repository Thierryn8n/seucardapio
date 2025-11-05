import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, ThumbsDown, Edit, Trash2, User, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Review {
  id: string;
  order_id: string;
  restaurant_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  helpful_count: number;
  user?: {
    name: string;
    email: string;
  };
}

interface ReviewFormProps {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  onReviewSubmitted?: () => void;
}

interface ReviewListProps {
  restaurantId: string;
  currentUserId?: string;
  canEdit?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ 
  orderId, 
  restaurantId, 
  restaurantName, 
  onReviewSubmitted 
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          restaurant_id: restaurantId,
          user_id: user.id,
          rating,
          comment: comment.trim(),
          helpful_count: 0
        });

      if (error) throw error;

      setComment('');
      setRating(5);
      onReviewSubmitted?.();
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange?: (rating: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange?.(star)}
            className={`p-1 transition-colors ${onRatingChange ? 'hover:text-yellow-500 cursor-pointer' : 'cursor-default'}`}
            disabled={!onRatingChange}
          >
            <Star
              className={`h-6 w-6 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Avaliar {restaurantName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sua avaliação</label>
            <StarRating rating={rating} onRatingChange={setRating} />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Comentário</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte-nos sobre sua experiência..."
              rows={4}
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting || !comment.trim()}>
            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export const ReviewList: React.FC<ReviewListProps> = ({ 
  restaurantId, 
  currentUserId, 
  canEdit = false 
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);

  useEffect(() => {
    loadReviews();
  }, [restaurantId]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:profiles!reviews_user_id_fkey(name, email)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          comment: editComment.trim(),
          rating: editRating,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;

      setEditingReview(null);
      loadReviews();
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      loadReviews();
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
    }
  };

  const handleHelpful = async (reviewId: string, helpful: boolean) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          helpful_count: helpful ? reviews.find(r => r.id === reviewId)?.helpful_count + 1 || 1 : 
                                 Math.max(0, (reviews.find(r => r.id === reviewId)?.helpful_count || 1) - 1)
        })
        .eq('id', reviewId);

      if (error) throw error;
      loadReviews();
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
    }
  };

  const StarDisplay = ({ rating }: { rating: number }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-4">Carregando avaliações...</div>;
  }

  if (reviews.length === 0) {
    return <div className="text-center py-4 text-gray-500">Nenhuma avaliação encontrada</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Avaliações dos Clientes</h3>
      
      {reviews.map((review) => (
        <Card key={review.id} className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{review.user?.name || 'Usuário Anônimo'}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(review.created_at), 'PPP', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StarDisplay rating={review.rating} />
                {canEdit && currentUserId === review.user_id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingReview(review.id);
                        setEditComment(review.comment);
                        setEditRating(review.rating);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {editingReview === review.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Avaliação:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setEditRating(star)}
                        className="p-1 hover:text-yellow-500"
                      >
                        <Star
                          className={`h-4 w-4 ${star <= editRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdateReview(review.id)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingReview(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-700 mb-3">{review.comment}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <button
                    onClick={() => handleHelpful(review.id, true)}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    Útil ({review.helpful_count})
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
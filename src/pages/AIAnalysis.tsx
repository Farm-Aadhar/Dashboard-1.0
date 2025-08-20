import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { Upload, Camera, Mic, Brain, Leaf, AlertTriangle } from "lucide-react";

interface AISuggestion {
  id: string;
  suggestion_text: string;
  category: string;
  image_url?: string;
  timestamp: string;
}

export default function AIAnalysis() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [analysisPrompt, setAnalysisPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch AI suggestions
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as AISuggestion[];
    },
    enabled: !!user
  });

  // Add AI suggestion mutation
  const addSuggestionMutation = useMutation({
    mutationFn: async (suggestion: { text: string; category: string; imageUrl?: string }) => {
      const { error } = await supabase
        .from('ai_suggestions')
        .insert({
          user_id: user?.id,
          suggestion_text: suggestion.text,
          category: suggestion.category,
          image_url: suggestion.imageUrl
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-suggestions'] });
      toast({
        title: t('AI Analysis Complete'),
        description: t('New suggestion added successfully'),
      });
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage && !analysisPrompt) {
      toast({
        title: t('Error'),
        description: t('Please upload an image or enter analysis prompt'),
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Mock AI analysis - in real app, this would call an AI service
      const mockSuggestions = [
        {
          text: "Your crops show healthy growth patterns. Consider increasing nitrogen levels by 10% for optimal yield.",
          category: "nutrition"
        },
        {
          text: "Detected early signs of pest activity. Recommend organic neem oil treatment within 24 hours.",
          category: "pest_control"
        },
        {
          text: "Soil moisture levels are optimal. Continue current irrigation schedule.",
          category: "irrigation"
        }
      ];

      const randomSuggestion = mockSuggestions[Math.floor(Math.random() * mockSuggestions.length)];
      
      await addSuggestionMutation.mutateAsync({
        text: analysisPrompt || randomSuggestion.text,
        category: randomSuggestion.category,
        imageUrl: imagePreview || undefined
      });

      setSelectedImage(null);
      setImagePreview("");
      setAnalysisPrompt("");
      
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to analyze. Please try again.'),
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nutrition': return <Leaf className="h-4 w-4" />;
      case 'pest_control': return <AlertTriangle className="h-4 w-4" />;
      case 'irrigation': return <Brain className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nutrition': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pest_control': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'irrigation': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('AI Analysis')}</h1>
      </div>

      {/* Image Upload and Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('Crop Image Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            {imagePreview ? (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-sm mx-auto rounded-lg"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setImagePreview("");
                    setSelectedImage(null);
                  }}
                >
                  {t('Remove Image')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">{t('Upload crop image for analysis')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('PNG, JPG up to 10MB')}
                  </p>
                </div>
                <Button onClick={() => fileInputRef.current?.click()}>
                  {t('Choose File')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
          
          <Textarea
            placeholder={t('Describe what you want to analyze or ask questions about your crops...')}
            value={analysisPrompt}
            onChange={(e) => setAnalysisPrompt(e.target.value)}
            rows={3}
          />
          
          <Button
            onClick={handleAnalyzeImage}
            disabled={isAnalyzing || (!selectedImage && !analysisPrompt)}
            className="w-full"
          >
            {isAnalyzing ? t('Analyzing...') : t('Analyze with AI')}
          </Button>
        </CardContent>
      </Card>

      {/* Voice Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {t('Voice Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              {t('Ask questions about your farm using voice commands')}
            </p>
            <Button variant="outline" className="w-full">
              <Mic className="h-4 w-4 mr-2" />
              {t('Start Voice Recording')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent AI Suggestions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t('Loading suggestions...')}</p>
          ) : suggestions.length === 0 ? (
            <p className="text-muted-foreground">{t('No suggestions yet. Upload an image to get started!')}</p>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge className={getCategoryColor(suggestion.category)}>
                      {getCategoryIcon(suggestion.category)}
                      <span className="ml-1 capitalize">{suggestion.category.replace('_', ' ')}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(suggestion.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{suggestion.suggestion_text}</p>
                  {suggestion.image_url && (
                    <img
                      src={suggestion.image_url}
                      alt="Analysis"
                      className="w-24 h-24 object-cover rounded-md"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
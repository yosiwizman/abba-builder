import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryClient } from '../../stores/query-client';
import { AIGuideContent } from './AIGuideContent';
import { getAiGuideOptions } from '../../queries/ai-guide';

type GetAIGuideProps = {
  slug: string;
};

export function GetAIGuide(props: GetAIGuideProps) {
  const { slug: documentSlug } = props;

  const [,setIsLoading] = useState(true);
  const [,setIsRegenerating] = useState(false);

  const [,setError] = useState('');
  const { data: aiGuide, error: queryError } = useQuery(
    {
      ...getAiGuideOptions(documentSlug),
      enabled: !!documentSlug,
    },
    queryClient,
  );

  useEffect(() => {
    if (!aiGuide) {
      return;
    }

    setIsLoading(false);
  }, [aiGuide]);

  useEffect(() => {
    if (!queryError) {
      return;
    }

    setIsLoading(false);
    setError(queryError.message);
  }, [queryError]);

  

  return <AIGuideContent html={aiGuide?.html || ''} />;
}

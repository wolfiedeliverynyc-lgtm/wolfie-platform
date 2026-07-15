import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  /** Optional image URL */
  imageSrc?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data available',
  description = 'There is nothing to display at the moment.',
  imageSrc,
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-600">
    {imageSrc && (
      <img src={imageSrc} alt="Empty state" className="mb-4 max-h-48 w-auto opacity-70" />
    )}
    <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
    <p className="text-sm">{description}</p>
  </div>
);

export default EmptyState;

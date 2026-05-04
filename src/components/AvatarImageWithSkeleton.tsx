import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = React.ComponentPropsWithoutRef<typeof AvatarImage> & {
  /** Extra classes for the skeleton overlay shown while loading */
  skeletonClassName?: string;
};

/**
 * AvatarImage that shows a Skeleton overlay while the image is loading.
 * Improves perceived performance for remote profile photos.
 */
export function AvatarImageWithSkeleton({
  src,
  className,
  skeletonClassName,
  onLoad,
  onError,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);

  // Reset when src changes (e.g., after upload)
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <>
      {!loaded && src ? (
        <Skeleton
          aria-hidden="true"
          className={cn("absolute inset-0 h-full w-full rounded-full", skeletonClassName)}
        />
      ) : null}
      <AvatarImage
        {...rest}
        src={src}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setLoaded(true);
          onError?.(e);
        }}
      />
    </>
  );
}

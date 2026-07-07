import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';

type Props = {
  images: ImageSourcePropType[];
  /** Tỉ lệ khung ảnh (rộng / cao). Banner ~ 1.85 */
  aspectRatio?: number;
  /** Thời gian tự chuyển (ms). 0 = tắt autoplay */
  autoPlayInterval?: number;
  className?: string;
};

export default function Carousel({
  images,
  aspectRatio = 1.85,
  autoPlayInterval = 3500,
  className = '',
}: Props) {
  const listRef = useRef<FlatList>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  useEffect(() => {
    if (!autoPlayInterval || images.length <= 1 || width === 0) return;
    const timer = setInterval(() => {
      if (paused.current) return;
      setIndex((prev) => {
        const next = (prev + 1) % images.length;
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlayInterval, images.length, width]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const imageHeight = width > 0 ? width / aspectRatio : 0;

  return (
    <View className={className} onLayout={onLayout}>
      {width > 0 && (
        <>
          {/*
            Bọc FlatList trong một View clip duy nhất.
            overflow:hidden ở đây mới thực sự cắt đứt background
            của FlatList/ScrollView tại đường bo góc.
            backgroundColor:'white' đảm bảo góc không bao giờ đen.
          */}
          {/* Lớp bọc giữ shadow mềm (loang, có chiều sâu) — KHÔNG clip để shadow không bị cắt.
              Lớp trong bo góc + clip ảnh. Kích thước cố định (không flex) để shadow luôn hiển thị. */}
          <View
            style={{
              width,
              height: imageHeight,
              borderRadius: 16,
              backgroundColor: 'white',
              shadowColor: '#0b1b3a',
              shadowOpacity: 0.18,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }}
          >
            <View
              style={{
                width,
                height: imageHeight,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <FlatList
                ref={listRef}
                data={images}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => (paused.current = true)}
                onScrollEndDrag={() => (paused.current = false)}
                onMomentumScrollEnd={onMomentumEnd}
                renderItem={({ item }) => (
                  <Image
                    source={item}
                    style={{ width, height: imageHeight }}
                    resizeMode="cover"
                  />
                )}
              />
            </View>
          </View>

          {images.length > 1 && (
            <View className="flex-row justify-center mt-3 gap-1.5">
              {images.map((_, i) => (
                <View
                  key={i}
                  className={`h-1.5 rounded-full ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-gray-300'}`}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_BASKET, loadBasket, saveBasket } from '../services/basketStorage';
import type { Basket, BasketItem } from '../types/basket';
import type { CompanionType, StylePreference } from '../types/companion';
import type { Content } from '../types/content';
import type { Priority } from '../types/priority';

// 바구니는 로그인 여부와 무관하게 기기에 로컬로 저장한다.
// 로그인은 일정 저장·공유·수정 시점에만 필요하다.
export function useBasket() {
  const [basket, setBasket] = useState<Basket | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  // 갱신 기준값을 state가 아니라 ref에서 읽는다. state를 읽으면 같은 렌더에서 만들어진
  // 클로저들이 모두 같은 옛 바구니를 보게 되어, 병렬로 호출됐을 때(예: 우선순위 일괄 저장)
  // 마지막 호출이 앞선 변경을 덮어쓴다.
  const latest = useRef<Basket>(EMPTY_BASKET);

  useEffect(() => {
    loadBasket().then((loaded) => {
      latest.current = loaded;
      setBasket(loaded);
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback(async (update: (current: Basket) => Basket) => {
    const next = update(latest.current);
    latest.current = next;
    setBasket(next);
    await saveBasket(next);
  }, []);

  const addItem = useCallback(
    async (content: Content, priority: Priority) => {
      await persist((current) => {
        if (current.items.some((item) => item.contentId === content.id)) return current;
        const item: BasketItem = {
          itemId: content.id,
          contentId: content.id,
          title: content.name,
          thumbnailUrl: content.imageUrl,
          priority,
          desiredStayMinutes: null,
        };
        return { ...current, items: [...current.items, item] };
      });
    },
    [persist],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await persist((current) => ({
        ...current,
        items: current.items.filter((item) => item.itemId !== itemId),
      }));
    },
    [persist],
  );

  // 지역을 바꾸면 이전 지역에서 담은 콘텐츠는 새 지역과 무관해지므로 비운다.
  const clearItems = useCallback(async () => {
    await persist((current) => ({ ...current, items: [] }));
  }, [persist]);

  const updateItemPriority = useCallback(
    async (itemId: string, priority: Priority) => {
      await persist((current) => ({
        ...current,
        items: current.items.map((item) => (item.itemId === itemId ? { ...item, priority } : item)),
      }));
    },
    [persist],
  );

  // 한번 지정하면 null로 되돌릴 방법이 없다(BasketItem.desiredStayMinutes 주석의 서버 제약 참고) —
  // 그래서 minutes는 항상 10~480 범위의 값만 받고, 호출부(PrioritySelectScreen)도 "지우기"는
  // 제공하지 않고 조정만 제공한다.
  const updateItemStayMinutes = useCallback(
    async (itemId: string, minutes: number) => {
      await persist((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.itemId === itemId ? { ...item, desiredStayMinutes: minutes } : item,
        ),
      }));
    },
    [persist],
  );

  const updateConditions = useCallback(
    async (input: {
      regionId: string | null;
      travelDate: string | null;
      duration: number | null;
      companion: CompanionType | null;
      stylePrefs: StylePreference[];
    }) => {
      await persist((current) => ({
        ...current,
        conditions: {
          region: input.regionId,
          travelDate: input.travelDate,
          duration: input.duration,
          companion: input.companion,
          stylePrefs: input.stylePrefs,
        },
      }));
    },
    [persist],
  );

  return {
    basket,
    isLoading,
    addItem,
    removeItem,
    clearItems,
    updateItemPriority,
    updateItemStayMinutes,
    updateConditions,
  };
}

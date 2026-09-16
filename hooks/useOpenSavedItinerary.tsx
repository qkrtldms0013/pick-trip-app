import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useState } from 'react';
import { ConfirmModal } from '../components/molecules/ConfirmModal';
import { useAppState } from '../contexts/AppStateContext';
import type { RootStackParamList } from '../types/navigation';

// "저장한 여행" 목록(itineraryHistory)은 contexts/AppStateContext.tsx가 GET /itineraries로
// 받아온다. 목록에서 하나를 고르면 SavedItineraryScreen(RootNavigator의 SavedItineraryGate)으로
// 이동한다 — 단건 조회·수정(장소 추가·삭제·순서 변경)까지 그 화면 안에서 처리하므로
// 여기서는 그냥 화면 전환만 한다. 홈/마이페이지/저장한 여행 전체 목록(SavedTripsScreen)이
// 모두 같은 흐름을 쓰므로 훅으로 공통화한다(원래 MainTabNavigator.tsx 안에만 있었다).
export function useOpenSavedItinerary() {
  const { itineraryHistory, removeSavedItinerary } = useAppState();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const openItinerary = (itineraryId: string) => {
    navigation.navigate('SavedItinerary', { itineraryId });
  };

  // 이 목록은 이 기기에만 있는 로컬 히스토리라, 여기서 지워도 서버에 저장된 일정 자체는
  // 남아있다(단건 삭제 API가 없어 지울 방법이 없음). "목록에서만 지워진다"는 걸 명확히
  // 하려고 확인 모달을 거친다.
  const [pendingDelete, setPendingDelete] = useState<{ itineraryId: string; title: string } | null>(
    null,
  );

  const deleteItinerary = (itineraryId: string, title: string) => {
    setPendingDelete({ itineraryId, title });
  };

  const confirmDelete = () => {
    if (pendingDelete) removeSavedItinerary(pendingDelete.itineraryId);
    setPendingDelete(null);
  };

  const deleteModal = (
    <ConfirmModal
      visible={pendingDelete !== null}
      title="일정을 지울까요?"
      message={
        pendingDelete ? `"${pendingDelete.title}"을(를) 저장한 여행 목록에서 지웁니다.` : undefined
      }
      confirmLabel="지우기"
      destructive
      onConfirm={confirmDelete}
      onCancel={() => setPendingDelete(null)}
    />
  );

  // openingItineraryId는 이제 항상 null이다 — 예전엔 단건 조회가 끝날 때까지 카드에 로딩
  // 스피너를 보여줬는데, 지금은 화면 전환이 즉시 일어나고 조회는 새 화면에서 하기 때문에
  // 더 이상 기다릴 일이 없다. HomeContent/ProfileContent/SavedTripsScreen의 prop 형태만
  // 그대로 맞춰준다.
  return {
    itineraryHistory,
    openingItineraryId: null,
    openItinerary,
    deleteItinerary,
    deleteModal,
  };
}

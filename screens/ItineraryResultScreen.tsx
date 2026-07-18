import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { ProgressChecklist } from '../components/molecules/ProgressChecklist';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { CONTENTS } from '../constants/contents';
import { generateItinerary } from '../services/generateItinerary';
import { saveItinerary } from '../services/itineraryStorage';
import { addStop, moveStop, removeStop } from '../services/scheduleActions';
import { buildShareText, shareItinerary } from '../services/shareItinerary';
import type { ItineraryStop } from '../types/itinerary';
import type { Priority } from '../types/priority';

interface ItineraryResultScreenProps {
  selectedRegions: string[];
  selectedIds: string[];
  priorities: Record<string, Priority>;
  initialStops?: ItineraryStop[];
}

const GENERATING_STEPS = [
  { label: '담은 장소 분석', sub: '위치·카테고리 확인' },
  { label: '이동 시간 계산', sub: '최적 동선 탐색' },
  { label: '운영 시간 확인', sub: '방문 가능 시간 매칭' },
  { label: '일정 구성', sub: '우선순위·흐름 반영' },
];

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const LoadingContainer = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Header = styled(View)`
  padding-top: 24px;
  padding-horizontal: 20px;
  padding-bottom: 12px;
`;

const Title = styled(Text)`
  font-size: 24px;
  font-weight: 500;
  color: ${COLORS.gray900};
`;

const Subtitle = styled(Text)`
  font-size: 15px;
  color: ${COLORS.gray500};
  margin-top: 6px;
`;

const DayLabel = styled(Text)`
  font-size: 17px;
  font-weight: 700;
  color: ${COLORS.gray900};
  margin: 20px 20px 12px;
`;

const StopRow = styled(View)`
  flex-direction: row;
  gap: 14px;
  padding-horizontal: 20px;
  margin-bottom: 18px;
`;

const TimeColumn = styled(View)`
  align-items: center;
  width: 44px;
`;

const TimeText = styled(Text)`
  font-size: 13px;
  font-weight: 600;
  color: ${COLORS.gray700};
`;

const TimeConnector = styled(View)`
  flex: 1;
  width: 2px;
  background-color: ${COLORS.gray200};
  margin-top: 8px;
`;

const StopCard = styled(View)`
  flex: 1;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  border-radius: 12px;
  padding: 14px 16px;
  background-color: ${COLORS.white};
`;

const CategoryBadge = styled(View)<{ $color: string }>`
  align-self: flex-start;
  background-color: ${({ $color }) => `${$color}1F`};
  border-radius: 100px;
  padding-vertical: 2px;
  padding-horizontal: 8px;
  margin-bottom: 6px;
`;

const CategoryLabel = styled(Text)<{ $color: string }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const StopName = styled(Text)`
  font-size: 16px;
  font-weight: 600;
  color: ${COLORS.gray900};
`;

const ReasonBox = styled(View)`
  flex-direction: row;
  gap: 6px;
  background-color: ${COLORS.teal50};
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 10px;
`;

const ReasonEmoji = styled(Text)`
  font-size: 13px;
`;

const ReasonText = styled(Text)`
  flex: 1;
  font-size: 12px;
  color: ${COLORS.teal700};
  line-height: 17px;
`;

const ActionRow = styled(View)`
  flex-direction: row;
  gap: 8px;
  margin-top: 10px;
`;

const ActionButton = styled(TouchableOpacity)`
  padding-vertical: 6px;
  padding-horizontal: 12px;
  border-radius: 8px;
  background-color: ${COLORS.gray100};
`;

const ActionLabel = styled(Text)`
  font-size: 13px;
  color: ${COLORS.gray700};
`;

const AddButton = styled(TouchableOpacity)`
  margin-horizontal: 20px;
  margin-bottom: 16px;
  padding-vertical: 10px;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${COLORS.amber500};
  align-items: center;
`;

const AddButtonLabel = styled(Text)`
  font-size: 14px;
  color: ${COLORS.amber500};
  font-weight: 500;
`;

const CandidateRow = styled(TouchableOpacity)`
  background-color: ${COLORS.white};
  border-radius: 8px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin-horizontal: 20px;
  margin-bottom: 8px;
  padding: 10px 14px;
`;

const CandidateName = styled(Text)`
  font-size: 14px;
  color: ${COLORS.gray900};
`;

const SaveButton = styled(TouchableOpacity)`
  margin-horizontal: 20px;
  margin-top: 4px;
  margin-bottom: 12px;
  padding-vertical: 14px;
  border-radius: 12px;
  align-items: center;
  background-color: ${COLORS.amber500};
`;

const SaveButtonLabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 16px;
  font-weight: 500;
`;

const ShareButton = styled(TouchableOpacity)`
  margin-horizontal: 20px;
  margin-bottom: 24px;
  padding-vertical: 14px;
  border-radius: 12px;
  align-items: center;
  background-color: ${COLORS.white};
  border-width: 1px;
  border-color: ${COLORS.gray200};
`;

const ShareButtonLabel = styled(Text)`
  color: ${COLORS.gray700};
  font-size: 16px;
  font-weight: 500;
`;

export function ItineraryResultScreen({
  selectedRegions,
  selectedIds,
  priorities,
  initialStops,
}: ItineraryResultScreenProps) {
  const [status, setStatus] = useState<'loading' | 'done'>(initialStops ? 'done' : 'loading');
  const [stops, setStops] = useState<ItineraryStop[]>(
    () => initialStops ?? generateItinerary({ selectedIds, priorities }).stops,
  );
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    try {
      await saveItinerary({
        selectedRegions,
        selectedIds,
        priorities,
        stops,
        savedAt: new Date().toISOString(),
      });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const contentById = useMemo(() => Object.fromEntries(CONTENTS.map((c) => [c.id, c])), []);

  const usedIds = stops.map((s) => s.contentId);
  const candidates = CONTENTS.filter(
    (c) => selectedRegions.includes(c.regionId) && !usedIds.includes(c.id),
  );

  if (status === 'loading') {
    return (
      <ScreenContainer>
        <LoadingContainer>
          <ProgressChecklist
            icon="🪄"
            heading="AI가 일정을 만들고 있어요"
            subText={`${selectedIds.length}곳 맞춤 구성 중`}
            steps={GENERATING_STEPS}
            onDone={() => setStatus('done')}
          />
        </LoadingContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header>
        <Title>일정이 완성됐어요</Title>
        <Subtitle>1박 2일 기준으로 만들었어요</Subtitle>
      </Header>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {[1, 2].map((day) => {
          const dayStops = stops.filter((stop) => stop.day === day);
          return (
            <View key={day}>
              <DayLabel>{day}일차</DayLabel>
              {dayStops.map((stop, index) => {
                const content = contentById[stop.contentId];
                const category = content && CATEGORIES.find((c) => c.id === content.category);
                const accentColor = content?.color ?? COLORS.gray500;
                return (
                  <StopRow key={stop.contentId}>
                    <TimeColumn>
                      <TimeText>{stop.startTime}</TimeText>
                      {index < dayStops.length - 1 && <TimeConnector />}
                    </TimeColumn>
                    <StopCard>
                      {category && (
                        <CategoryBadge $color={accentColor}>
                          <CategoryLabel $color={accentColor}>
                            {category.emoji} {category.label}
                          </CategoryLabel>
                        </CategoryBadge>
                      )}
                      <StopName>{content?.name}</StopName>
                      <ReasonBox>
                        <ReasonEmoji>🪄</ReasonEmoji>
                        <ReasonText>{stop.reason}</ReasonText>
                      </ReasonBox>
                      <ActionRow>
                        <ActionButton
                          onPress={() => setStops((prev) => moveStop(prev, stop.contentId, 'up'))}
                        >
                          <ActionLabel>▲</ActionLabel>
                        </ActionButton>
                        <ActionButton
                          onPress={() => setStops((prev) => moveStop(prev, stop.contentId, 'down'))}
                        >
                          <ActionLabel>▼</ActionLabel>
                        </ActionButton>
                        <ActionButton
                          onPress={() => setStops((prev) => removeStop(prev, stop.contentId))}
                        >
                          <ActionLabel>삭제</ActionLabel>
                        </ActionButton>
                      </ActionRow>
                    </StopCard>
                  </StopRow>
                );
              })}
              <AddButton onPress={() => setExpandedDay((prev) => (prev === day ? null : day))}>
                <AddButtonLabel>+ 장소 추가</AddButtonLabel>
              </AddButton>
              {expandedDay === day &&
                candidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    onPress={() => {
                      setStops((prev) => addStop(prev, candidate.id, day));
                      setExpandedDay(null);
                    }}
                  >
                    <CandidateName>{candidate.name}</CandidateName>
                  </CandidateRow>
                ))}
            </View>
          );
        })}
      </ScrollView>
      <SaveButton onPress={handleSave} activeOpacity={0.8}>
        <SaveButtonLabel>
          {saveState === 'saved'
            ? '저장 완료'
            : saveState === 'error'
              ? '저장 실패했습니다. 다시 시도해주세요.'
              : '일정 저장'}
        </SaveButtonLabel>
      </SaveButton>
      <ShareButton
        onPress={() => shareItinerary(buildShareText({ stops, contentById }))}
        activeOpacity={0.8}
      >
        <ShareButtonLabel>공유하기</ShareButtonLabel>
      </ShareButton>
    </ScreenContainer>
  );
}

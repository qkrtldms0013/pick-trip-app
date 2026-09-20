import { View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import { SkeletonBox } from '../atoms/SkeletonBox';

// PrioritySelectScreen의 Card(좌측 4px 색 바 + 정보 + 세그먼트 컨트롤) 치수를 맞춘 로딩 자리표시자.
const Card = styled(View)`
  flex-direction: row;
  background-color: ${COLORS.white};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin-horizontal: 20px;
  overflow: hidden;
`;

const Body = styled(View)`
  flex: 1;
  padding: 14px 15px;
  gap: 10px;
`;

const TopRow = styled(View)`
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
`;

const NameColumn = styled(View)`
  flex: 1;
`;

// 카드 높이가 본문 내용에 따라 정해지므로, 좌측 색 바는 고정 높이 대신
// row 컨테이너의 기본 stretch로 본문과 같은 높이를 맞춘다.
const ColorBar = styled(View)`
  width: 4px;
  background-color: ${COLORS.gray200};
`;

export function PriorityCardSkeleton() {
  return (
    <Card>
      <ColorBar />
      <Body>
        <TopRow>
          <NameColumn>
            <SkeletonBox width="55%" height={15} radius={4} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={12} radius={4} />
          </NameColumn>
          <SkeletonBox width={44} height={26} radius={8} />
        </TopRow>
        <SkeletonBox height={38} radius={11} />
      </Body>
    </Card>
  );
}

import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { COLORS } from '../constants/colors';
import { TAB_BAR_CLEARANCE } from '../constants/layout';
import type { LegalSection } from '../constants/legalDocuments';
import { FONT } from '../constants/typography';

interface LegalDocumentScreenProps {
  sections: LegalSection[];
  lastUpdated: string;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.white};
`;

const Scroll = styled(ScrollView)`
  flex: 1;
`;

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 위에 떠 있다.
// 그 아래에 상단 패딩을 또 주면 헤더와 본문 사이가 붕 떠 보여서, 상단은 0으로 둔다.
const Content = styled(View)`
  padding: 0 20px ${TAB_BAR_CLEARANCE}px;
`;

const UpdatedAt = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray400};
  margin-bottom: 20px;
`;

const SectionBlock = styled(View)`
  margin-bottom: 20px;
`;

const SectionHeading = styled(Text)`
  font-family: ${FONT.bold};
  font-size: 15px;
  color: ${COLORS.gray900};
  margin-bottom: 8px;
`;

const SectionBody = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 14px;
  line-height: 21px;
  color: ${COLORS.gray700};
`;

// 이용약관 / 개인정보처리방침처럼 제목+본문 섹션 목록으로 이루어진 정적 법적 문서를
// 공통 레이아웃으로 보여준다. 실제 내용은 constants/legalDocuments.ts 참고.
export function LegalDocumentScreen({ sections, lastUpdated }: LegalDocumentScreenProps) {
  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <Scroll showsVerticalScrollIndicator={false}>
        <Content>
          <UpdatedAt>시행일 {lastUpdated}</UpdatedAt>
          {sections.map((section) => (
            <SectionBlock key={section.heading}>
              <SectionHeading>{section.heading}</SectionHeading>
              <SectionBody>{section.body}</SectionBody>
            </SectionBlock>
          ))}
        </Content>
      </Scroll>
    </ScreenContainer>
  );
}

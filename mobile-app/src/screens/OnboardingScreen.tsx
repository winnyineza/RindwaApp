import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onboardingData = [
    {
      icon: 'shield',
      title: t('onboarding.title1'),
      description: t('onboarding.desc1'),
    },
    {
      icon: 'flash-on',
      title: t('onboarding.title2'),
      description: t('onboarding.desc2'),
    },
    {
      icon: 'group',
      title: t('onboarding.title3'),
      description: t('onboarding.desc3'),
    },
  ];

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / screenWidth);
    setCurrentPage(page);
  };

  const goToNext = () => {
    if (currentPage < onboardingData.length - 1) {
      const nextPage = currentPage + 1;
      scrollRef.current?.scrollTo({ x: nextPage * screenWidth, animated: true });
      setCurrentPage(nextPage);
    } else {
      navigation.navigate('Auth' as never);
    }
  };

  const goToPrev = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      scrollRef.current?.scrollTo({ x: prevPage * screenWidth, animated: true });
      setCurrentPage(prevPage);
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary, '#7f1d1d']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.iconContainer}>
              <Icon name={item.icon} size={80} color="#ffffff" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === currentPage ? '#ffffff' : 'rgba(255, 255, 255, 0.3)' },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {currentPage > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={goToPrev}>
              <Icon name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.nextButton} onPress={goToNext}>
            <Text style={styles.buttonText}>
              {currentPage === onboardingData.length - 1 ? t('onboarding.getStarted') : 'Next'}
            </Text>
            <Icon name="arrow-forward" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    borderRadius: 25,
    marginLeft: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 10,
  },
});

export default OnboardingScreen;
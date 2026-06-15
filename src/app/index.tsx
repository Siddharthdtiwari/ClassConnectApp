import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import GlassInput from '../components/GlassInput';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const { colors, isDark } = useTheme();

  const handleLogin = async () => {
    if (!id || !password) {
      setErrorMsg('Please enter both ID and password');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const endpoint = role === 'student' ? '/auth/student/login' : '/auth/teacher/login';
      const trimmedId = id.trim().toUpperCase();
      const payload = role === 'student' ? { studentId: trimmedId, password } : { teacherId: trimmedId, password };
      const response = await client.post(endpoint, payload);
      const { token, user } = response.data;
      await login(token, user);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'transparent' }} contentContainerStyle={styles.scrollContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Premium Banner */}
        <LinearGradient
          colors={[colors.p, colors.pm]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerDecor1} />
          <View style={styles.bannerDecor2} />
          <Text style={styles.bannerTitle}>ClassConnect</Text>
          <Text style={styles.bannerSubtitle}>Your central hub for success.</Text>
        </LinearGradient>

        {/* Glass Card */}
        <GlassCard style={{ padding: 24 }}>
          <Text style={[styles.cardHeading, { color: colors.fg }]}>Sign In</Text>

          {/* Role Toggle */}
          <View style={[styles.roleContainer, { backgroundColor: colors.bg2 }]}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'student' && [styles.roleButtonActive, { backgroundColor: isDark ? colors.bgc : '#ffffff' }]]}
              onPress={() => setRole('student')}
            >
              <Text style={[styles.roleText, { color: colors.fdd }, role === 'student' && [styles.roleTextActive, { color: colors.pt }]]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'teacher' && [styles.roleButtonActive, { backgroundColor: isDark ? colors.bgc : '#ffffff' }]]}
              onPress={() => setRole('teacher')}
            >
              <Text style={[styles.roleText, { color: colors.fdd }, role === 'teacher' && [styles.roleTextActive, { color: colors.pt }]]}>Teacher</Text>
            </TouchableOpacity>
          </View>

          {/* ID Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.fdd }]}>{role === 'student' ? 'STUDENT ID' : 'TEACHER ID'}</Text>
            <GlassInput
              placeholder={`Enter your ${role === 'student' ? 'Student' : 'Teacher'} ID`}
              value={id}
              onChangeText={setId}
              autoCapitalize="characters"
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.fdd }]}>PASSWORD</Text>
            <GlassInput
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          {errorMsg ? (
            <Text style={{ color: colors.rt, textAlign: 'center', marginBottom: 12, fontFamily: 'Inter_500Medium' }}>
              {errorMsg}
            </Text>
          ) : null}
          <PremiumButton
            title="LOGIN"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 4 }}
          />
        </GlassCard>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  banner: {
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerDecor1: {
    position: 'absolute',
    top: -64,
    right: -64,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  bannerDecor2: {
    position: 'absolute',
    bottom: -80,
    right: 128,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bannerTitle: {
    fontFamily: 'Unbounded_900Black',
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(12,12,12,0.12)',
    borderRadius: 20,
    padding: 24,
  },
  cardHeading: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 20,
    color: '#0C0C0C',
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDE8F5',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: 'rgba(12,12,12,0.60)',
  },
  roleTextActive: {
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 10,
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: 2,
  },
});

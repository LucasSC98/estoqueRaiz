import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const toastConfig = {
  success: (props) => (
    <View style={{
      backgroundColor: '#10B981',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <MaterialIcons name="check-circle" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'NunitoSans_600SemiBold',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: 'NunitoSans_400Regular',
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
  
  error: (props) => (
    <View style={{
      backgroundColor: '#EF4444',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <MaterialIcons name="error" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'NunitoSans_600SemiBold',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: 'NunitoSans_400Regular',
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
  
  warning: (props) => (
    <View style={{
      backgroundColor: '#F59E0B',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <MaterialIcons name="warning" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'NunitoSans_600SemiBold',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: 'NunitoSans_400Regular',
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
  
  info: (props) => (
    <View style={{
      backgroundColor: '#3B82F6',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <MaterialIcons name="info" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'NunitoSans_600SemiBold',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: 'NunitoSans_400Regular',
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
};

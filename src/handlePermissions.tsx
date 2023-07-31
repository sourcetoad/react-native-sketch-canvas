import {PermissionsAndroid, Platform} from 'react-native';

export const requestPermissions = async (
  permissionDialogTitle: string,
  permissionDialogMessage: string,
) => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE!,
      {
        title: permissionDialogTitle,
        message: permissionDialogMessage,
        buttonPositive: 'OK',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { parseSchedulePdf, type ScheduleImportResult } from '@/utils/scheduleImport';

/**
 * On Android, read the picker's content:// URI directly. The cached copy lives outside the
 * folders expo-file-system may read in Expo Go ("Missing 'READ' permission"); content URIs are exempt.
 */
export const PICKER_COPIES = Platform.OS !== 'android';

/** Opens a PDF picker and parses the class schedule. Null if cancelled; throws with a user-facing message on failure. */
export async function pickSchedulePdf(): Promise<(ScheduleImportResult & { fileName: string }) | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: PICKER_COPIES });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const bytes = await new File(asset.uri).bytes();
  return { ...parseSchedulePdf(bytes), fileName: asset.name };
}

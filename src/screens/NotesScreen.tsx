import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Card, Button, Chip, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TimeRecordService } from '../services/TimeRecordService';

interface CaregiverNote {
  id: string;
  caregiver_id: string;
  client_id: string;
  time_record_id?: string;
  note_type: 'shift_summary' | 'medication' | 'behavior' | 'activities' | 'concerns' | 'praise' | 'other';
  title?: string;
  content: string;
  is_private: boolean;
  is_urgent: boolean;
  client_can_view: boolean;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

const NOTE_TYPES = [
  { value: 'shift_summary', label: 'Shift Summary', icon: 'document-text' },
  { value: 'medication', label: 'Medication', icon: 'medical' },
  { value: 'behavior', label: 'Behavior', icon: 'heart' },
  { value: 'activities', label: 'Activities', icon: 'bicycle' },
  { value: 'concerns', label: 'Concerns', icon: 'warning' },
  { value: 'praise', label: 'Praise', icon: 'thumbs-up' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
] as const;

export default function NotesScreen() {
  const [notes, setNotes] = useState<CaregiverNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNoteType, setSelectedNoteType] = useState<CaregiverNote['note_type']>('shift_summary');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const timeRecordService = new TimeRecordService();
      const notesData = await timeRecordService.getCaregiverNotes();
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Error', 'Note content is required');
      return;
    }

    try {
      setIsCreating(true);
      const timeRecordService = new TimeRecordService();
      
      const result = await timeRecordService.createNote({
        note_type: selectedNoteType,
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
        is_private: isPrivate,
        is_urgent: isUrgent,
        client_can_view: !isPrivate,
        client_id: '1', // Default client for demo
      });

      if (result.success) {
        Alert.alert('Success', 'Note created successfully!');
        resetForm();
        setShowAddModal(false);
        await loadNotes();
      } else {
        Alert.alert('Error', result.error || 'Failed to create note');
      }
    } catch (error) {
      console.error('Create note error:', error);
      Alert.alert('Error', 'Failed to create note');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedNoteType('shift_summary');
    setNoteTitle('');
    setNoteContent('');
    setIsPrivate(false);
    setIsUrgent(false);
  };

  const getNoteTypeInfo = (type: CaregiverNote['note_type']) => {
    return NOTE_TYPES.find(nt => nt.value === type) || NOTE_TYPES[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Caregiver Notes</Text>
          <Text style={styles.subtitle}>Add notes for your clients</Text>
        </View>

        {/* Notes List */}
        {notes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="document-text" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptySubtitle}>Create your first note to get started</Text>
            </View>
          </Card>
        ) : (
          <View style={styles.notesContainer}>
            {notes.map((note) => {
              const noteTypeInfo = getNoteTypeInfo(note.note_type);
              return (
                <Card key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteHeaderLeft}>
                      <Ionicons 
                        name={noteTypeInfo.icon as any} 
                        size={20} 
                        color="#6b7280" 
                      />
                      <Chip style={styles.noteTypeChip}>
                        {noteTypeInfo.label}
                      </Chip>
                      {note.is_urgent && (
                        <Chip style={styles.urgentChip}>
                          <Ionicons name="warning" size={14} color="white" />
                          <Text style={styles.urgentText}>Urgent</Text>
                        </Chip>
                      )}
                      {note.is_private && (
                        <Chip style={styles.privateChip}>
                          <Ionicons name="eye-off" size={14} color="white" />
                          <Text style={styles.privateText}>Private</Text>
                        </Chip>
                      )}
                    </View>
                    <Text style={styles.noteDate}>
                      {formatDate(note.created_at)}
                    </Text>
                  </View>

                  {note.title && (
                    <Text style={styles.noteTitle}>{note.title}</Text>
                  )}

                  <Text style={styles.noteContent}>{note.content}</Text>

                  <View style={styles.noteFooter}>
                    <Text style={styles.noteClient}>
                      For: {note.client_name || 'Client'}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowAddModal(true)}
      />

      {/* Add Note Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Note</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Note Type Selection */}
            <Text style={styles.label}>Note Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {NOTE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    selectedNoteType === type.value && styles.typeChipSelected,
                  ]}
                  onPress={() => setSelectedNoteType(type.value)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={16} 
                    color={selectedNoteType === type.value ? 'white' : '#6b7280'} 
                  />
                  <Text style={[
                    styles.typeChipText,
                    selectedNoteType === type.value && styles.typeChipTextSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title */}
            <Text style={styles.label}>Title (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Brief title for the note..."
              value={noteTitle}
              onChangeText={setNoteTitle}
            />

            {/* Content */}
            <Text style={styles.label}>Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Detailed note content..."
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setIsUrgent(!isUrgent)}
              >
                <Ionicons 
                  name="warning" 
                  size={20} 
                  color={isUrgent ? '#ef4444' : '#6b7280'} 
                />
                <Text style={styles.optionText}>Mark as Urgent</Text>
                <View style={[styles.switch, isUrgent && styles.switchOn]} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <Ionicons 
                  name="eye-off" 
                  size={20} 
                  color={isPrivate ? '#ef4444' : '#6b7280'} 
                />
                <Text style={styles.optionText}>Private Note (Admin only)</Text>
                <View style={[styles.switch, isPrivate && styles.switchOn]} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowAddModal(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleCreateNote}
              disabled={isCreating || !noteContent.trim()}
              loading={isCreating}
              style={styles.createButton}
            >
              Create Note
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  notesContainer: {
    gap: 12,
  },
  noteCard: {
    padding: 16,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  noteTypeChip: {
    backgroundColor: '#e5e7eb',
  },
  urgentChip: {
    backgroundColor: '#ef4444',
  },
  urgentText: {
    color: 'white',
    fontSize: 12,
  },
  privateChip: {
    backgroundColor: '#6b7280',
  },
  privateText: {
    color: 'white',
    fontSize: 12,
  },
  noteDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  noteClient: {
    fontSize: 12,
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563EB',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  typeScroll: {
    marginBottom: 20,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeChipText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
  },
  typeChipTextSelected: {
    color: 'white',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  switch: {
    width: 44,
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
  },
  switchOn: {
    backgroundColor: '#2563EB',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#2563EB',
  },
});

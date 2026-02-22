import * as SQLite from 'expo-sqlite';
import { CONFIG, getAdminApiHeaders } from '../constants/Config';

interface TimeRecord {
  id: string;
  caregiver_id: string;
  client_id: string;
  clock_in_time: string;
  clock_out_time?: string;
  break_duration_minutes: number;
  total_hours?: number;
  status: 'active' | 'completed' | 'adjusted';
  location_gps_in?: { latitude: number; longitude: number };
  location_gps_out?: { latitude: number; longitude: number };
  notes?: string;
  created_at: string;
  updated_at: string;
}

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
}

interface ClockInRequest {
  client_id: string;
  notes?: string;
  location_gps_in?: { latitude: number; longitude: number };
}

interface ClockOutRequest {
  time_record_id: string;
  break_duration_minutes?: number;
  final_notes?: string;
  location_gps_out?: { latitude: number; longitude: number };
  early_exit_code?: string;
}

interface Client {
  id: string;
  name: string;
}

export class TimeRecordService {
  private db: SQLite.SQLiteDatabase | null = null;

  constructor() {
    this.initDatabase();
  }

  private async initDatabase() {
    try {
      this.db = await SQLite.openDatabaseAsync('caregiver_clock.db');
      
      // Create tables
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS time_records (
          id TEXT PRIMARY KEY,
          caregiver_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          clock_in_time TEXT NOT NULL,
          clock_out_time TEXT,
          break_duration_minutes INTEGER DEFAULT 0,
          total_hours REAL,
          status TEXT NOT NULL DEFAULT 'active',
          location_gps_in TEXT,
          location_gps_out TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS caregiver_notes (
          id TEXT PRIMARY KEY,
          caregiver_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          time_record_id TEXT,
          note_type TEXT NOT NULL DEFAULT 'shift_summary',
          title TEXT,
          content TEXT NOT NULL,
          is_private INTEGER DEFAULT 0,
          is_urgent INTEGER DEFAULT 0,
          client_can_view INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS note_read_status (
          id TEXT PRIMARY KEY,
          note_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          read_at TEXT NOT NULL
        );
      `);

      // Insert sample clients if empty
      await this.insertSampleClients();
      
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  private async insertSampleClients() {
    try {
      if (!this.db) return;
      
      const existingClients = await this.db.getAllAsync('SELECT COUNT(*) as count FROM clients');
      const count = (existingClients[0] as any).count;
      
      if (count === 0) {
        const sampleClients = [
          { id: '1', name: 'John Smith' },
          { id: '2', name: 'Mary Johnson' },
          { id: '3', name: 'Robert Davis' },
          { id: '4', name: 'Patricia Wilson' },
          { id: '5', name: 'Michael Brown' },
        ];

        for (const client of sampleClients) {
          await this.db.runAsync(
            'INSERT INTO clients (id, name) VALUES (?, ?)',
            [client.id, client.name]
          );
        }
      }
    } catch (error) {
      console.error('Error inserting sample clients:', error);
    }
  }

  async clockIn(request: ClockInRequest, userEmail: string): Promise<{ success: boolean; error?: string; shiftId?: string }> {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock-in',
          email: userEmail,
          client_id: request.client_id,
          notes: request.notes,
          location: request.location_gps_in
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to clock in' };
      }

      // Also save locally for backup/offline (optional, skipping for now to keep it simple)
      return { success: true, shiftId: data.shiftId };
    } catch (error) {
      console.error('Clock in error:', error);
      return { success: false, error: 'Network request failed' };
    }
  }

  async acknowledgeShift(clientId: string, userEmail: string, shiftId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          email: userEmail,
          client_id: clientId,
          shift_id: shiftId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to acknowledge care plan' };
      }

      return { success: true };
    } catch (error) {
      console.error('Acknowledgment error:', error);
      return { success: false, error: 'Network request failed' };
    }
  }

  async clockOut(request: ClockOutRequest, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clock-out',
          email: userEmail,
          notes: request.final_notes,
          location: request.location_gps_out,
          early_exit_code: request.early_exit_code
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to clock out' };
      }

      return { success: true };
    } catch (error) {
      console.error('Clock out error:', error);
      return { success: false, error: 'Network request failed' };
    }
  }

  async getActiveShift(userEmail: string): Promise<any> {
    try {
      // 1. Get Profile (includes ID)
      const profileRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/profile?email=${userEmail}`);
      const profileData = await profileRes.json();
      if (!profileData.success) return null;
      
      const caregiverId = profileData.caregiver.id;

      // 2. Fetch shifts for this caregiver
      const shiftsRes = await fetch(`${CONFIG.API_BASE_URL}/api/admin/shifts?caregiver_id=${caregiverId}&status=approved`, {
        headers: getAdminApiHeaders(),
      });
      const shifts = await shiftsRes.json();
      
      // 3. Find active (actual_start != null, actual_end == null)
      const active = shifts.find((s: any) => s.actual_start_time && !s.actual_end_time);
      
      if (!active) return null;

      return {
        id: active.id,
        caregiver_id: active.caregiver_id,
        client_id: active.client_id,
        client_name: active.client_name,
        clock_in_time: active.actual_start_time,
        scheduled_start: active.start_time,
        scheduled_end: active.end_time,
        notes: active.notes
      };

    } catch (error) {
      console.error('Get active shift error:', error);
      return null;
    }
  }

  async getEligibleShift(userEmail: string): Promise<any> {
    try {
      // 1. Get Profile
      const profileRes = await fetch(`${CONFIG.API_BASE_URL}/api/caregivers/profile?email=${userEmail}`);
      const profileData = await profileRes.json();
      if (!profileData.success) return null;
      
      const caregiverId = profileData.caregiver.id;

      // 2. Fetch shifts for this caregiver - filtering for today's approved shifts
      const shiftsRes = await fetch(`${CONFIG.API_BASE_URL}/api/admin/shifts?caregiver_id=${caregiverId}&status=approved`, {
        headers: getAdminApiHeaders(),
      });
      const shifts = await shiftsRes.json();
      
      if (!Array.isArray(shifts)) return null;

      const now = new Date();
      
      // Find the nearest upcoming shift that hasn't started yet
      // Logic: shift.actual_start_time is null AND start_time is within +/- 12 hours of now
      const eligible = shifts
        .filter((s: any) => !s.actual_start_time && !s.actual_end_time)
        .find((s: any) => {
          const shiftStart = new Date(s.start_time);
          const diffHours = Math.abs(shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);
          return diffHours <= 12; // 12 hour window
        });

      if (!eligible) return null;

      return {
        id: eligible.id,
        caregiver_id: eligible.caregiver_id,
        client_id: eligible.client_id,
        client_name: eligible.client_name,
        scheduled_start: eligible.start_time,
        scheduled_end: eligible.end_time,
        notes: eligible.notes
      };
    } catch (error) {
      console.error('Get eligible shift error:', error);
      return null;
    }
  }

  async getTimeRecords(caregiverId: string, limit: number = 50): Promise<TimeRecord[]> {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/admin/shifts?caregiver_id=${caregiverId}`, {
        headers: getAdminApiHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch records');
      
      const shifts = await res.json();
      
      // Map shifts to TimeRecord interface
      // Filter out shifts that haven't started (no actual_start_time) unless we want to show them?
      // History usually implies things that happened.
      
      return shifts
        .filter((s: any) => s.actual_start_time) // Only show shifts with clock-in
        .map((s: any) => {
          let status: 'active' | 'completed' | 'adjusted' = 'active';
          if (s.actual_end_time) status = 'completed';
          // if (s.is_adjusted) status = 'adjusted'; // field doesn't exist yet but logic is sound

          const totalHours = s.actual_end_time 
            ? (new Date(s.actual_end_time).getTime() - new Date(s.actual_start_time).getTime()) / (1000 * 60 * 60)
            : 0;

          return {
            id: s.id,
            caregiver_id: s.caregiver_id,
            client_id: s.client_id,
            client_name: s.client_name, // API returns this
            clock_in_time: s.actual_start_time,
            clock_out_time: s.actual_end_time,
            break_duration_minutes: 0, // Not in API yet
            total_hours: totalHours,
            status: status,
            notes: s.notes,
            created_at: s.created_at || new Date().toISOString(),
            updated_at: s.updated_at || new Date().toISOString(),
          } as TimeRecord;
        })
        .sort((a: any, b: any) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Get time records error:', error);
      return [];
    }
  }

  async getClients(): Promise<Client[]> {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/admin/clients`, {
        headers: getAdminApiHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch clients');
      
      const data = await res.json();
      
      return data.map((c: any) => ({
        id: c.id,
        name: c.name
      }));
    } catch (error) {
      console.error('Get clients error:', error);
      return [];
    }
  }

  async getClientClinicalData(clientId: string): Promise<any> {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/admin/clients/${clientId}`, {
        headers: getAdminApiHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch clinical data');
      
      const data = await res.json();
      if (data.success) {
        return {
          client: data.client,
          clinical: data.clinical
        };
      }
      return null;
    } catch (error) {
      console.error('Get client clinical data error:', error);
      return null;
    }
  }

  async createNote(note: Partial<CaregiverNote>): Promise<{ success: boolean; noteId?: string; error?: string }> {
    try {
      if (!this.db) {
        return { success: false, error: 'Database not initialized' };
      }

      const noteId = Date.now().toString();
      const now = new Date().toISOString();

      await this.db.runAsync(`
        INSERT INTO caregiver_notes (
          id, caregiver_id, client_id, time_record_id, note_type,
          title, content, is_private, is_urgent, client_can_view,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        noteId,
        'current_caregiver',
        note.client_id || '',
        note.time_record_id || null,
        note.note_type || 'shift_summary',
        note.title || null,
        note.content || '',
        note.is_private ? 1 : 0,
        note.is_urgent ? 1 : 0,
        note.client_can_view ? 1 : 0,
        now,
        now
      ]);

      return { success: true, noteId };
    } catch (error) {
      console.error('Create note error:', error);
      return { success: false, error: 'Failed to create note' };
    }
  }

  async getCaregiverNotes(clientId?: string, timeRecordId?: string): Promise<CaregiverNote[]> {
    try {
      if (!this.db) return [];

      let query = `
        SELECT cn.*, c.name as client_name
        FROM caregiver_notes cn
        LEFT JOIN clients c ON cn.client_id = c.id
        WHERE cn.caregiver_id = 'current_caregiver'
      `;
      const params: any[] = [];

      if (clientId) {
        query += ' AND cn.client_id = ?';
        params.push(clientId);
      }

      if (timeRecordId) {
        query += ' AND cn.time_record_id = ?';
        params.push(timeRecordId);
      }

      query += ' ORDER BY cn.created_at DESC';

      const notes = await this.db.getAllAsync(query, params);
      return notes as CaregiverNote[];
    } catch (error) {
      console.error('Get caregiver notes error:', error);
      return [];
    }
  }

  async getWeekStats(): Promise<{
    totalHours: number;
    totalShifts: number;
    estimatedEarnings: number;
  }> {
    try {
      if (!this.db) {
        return { totalHours: 0, totalShifts: 0, estimatedEarnings: 0 };
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const records = await this.db.getAllAsync(`
        SELECT total_hours FROM time_records
        WHERE caregiver_id = 'current_caregiver' 
          AND status = 'completed'
          AND clock_in_time >= ?
      `, [oneWeekAgo.toISOString()]);

      const totalHours = records.reduce((sum: number, record: any) => 
        sum + (record.total_hours || 0), 0
      );

      const totalShifts = records.length;
      const hourlyRate = 30; // Mock hourly rate
      const estimatedEarnings = totalHours * hourlyRate;

      return {
        totalHours: Math.round(totalHours * 10) / 10,
        totalShifts,
        estimatedEarnings: Math.round(estimatedEarnings),
      };
    } catch (error) {
      console.error('Get week stats error:', error);
      return { totalHours: 0, totalShifts: 0, estimatedEarnings: 0 };
    }
  }
}

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

export async function getGroups() {
  const snap = await getDocs(collection(db, 'groups'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getGroup(groupId) {
  const snap = await getDoc(doc(db, 'groups', groupId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createGroup({ name, grade, letter, schoolYear, createdBy }) {
  return addDoc(collection(db, 'groups'), {
    name,
    grade,
    letter,
    schoolYear,
    teacherIds: [],
    studentIds: [],
    allowedTopicIds: [],
    allowedQuizSetIds: [],
    allowedGames: [],
    isActive: true,
    createdAt: serverTimestamp(),
    createdBy,
  })
}

export async function updateGroup(groupId, data) {
  return updateDoc(doc(db, 'groups', groupId), data)
}

// Asignar estudiante a grupo — actualiza users/{uid}.groupId y groups/{groupId}.studentIds en batch
export async function assignStudentToGroup(userId, groupId) {
  const batch = writeBatch(db)

  const userRef = doc(db, 'users', userId)
  const groupRef = doc(db, 'groups', groupId)

  // Primero verificar si el usuario ya tiene un grupo y quitarlo
  const userSnap = await getDoc(userRef)
  if (userSnap.exists() && userSnap.data().groupId) {
    const prevGroupId = userSnap.data().groupId
    if (prevGroupId !== groupId) {
      batch.update(doc(db, 'groups', prevGroupId), { studentIds: arrayRemove(userId) })
    }
  }

  batch.update(userRef, { groupId })
  batch.update(groupRef, { studentIds: arrayUnion(userId) })

  return batch.commit()
}

export async function removeStudentFromGroup(userId, groupId) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', userId), { groupId: null })
  batch.update(doc(db, 'groups', groupId), { studentIds: arrayRemove(userId) })
  return batch.commit()
}

export async function assignTeacherToGroup(teacherId, groupId) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', teacherId), { assignedGroups: arrayUnion(groupId) })
  batch.update(doc(db, 'groups', groupId), { teacherIds: arrayUnion(teacherId) })
  return batch.commit()
}

export async function removeTeacherFromGroup(teacherId, groupId) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', teacherId), { assignedGroups: arrayRemove(groupId) })
  batch.update(doc(db, 'groups', groupId), { teacherIds: arrayRemove(teacherId) })
  return batch.commit()
}

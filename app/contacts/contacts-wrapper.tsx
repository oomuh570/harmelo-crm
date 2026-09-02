'use client';

import { useState } from 'react';
import { type Contact } from './contact';
import ImportContactsButton from './import-contacts-button';
import MergeContactsDialog from './merge-contacts-dialog';
import ContactsTable from './contacts-table';
import AddContactForm from './add-contact-form';

export default function ContactsWrapper({
  initialData,
  initialTotalPages,
  workspaceId,
}: {
  initialData: Contact[];
  initialTotalPages: number;
  workspaceId: string;
}) {
  const [selectedContacts, setSelectedContacts] = useState<Array<{ id: string; name: string }>>([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  function handleSelectContacts(contacts: Array<{ id: string; name: string }>) {
    setSelectedContacts(contacts);
    if (contacts.length === 2) {
      setShowMergeDialog(true);
    }
  }

  return (
    <>
      <div className="mb-4 flex gap-2">
        <AddContactForm />
        <ImportContactsButton workspaceId={workspaceId} />
        {selectedContacts.length === 2 && (
          <button
            onClick={() => setShowMergeDialog(true)}
            className="px-4 py-2 bg-purple-600/20 border border-purple-600 text-purple-400 font-medium rounded-md hover:bg-purple-600/30 transition-colors"
          >
            Merge ({selectedContacts.length})
          </button>
        )}
      </div>

      <ContactsTable
        initialData={initialData}
        initialTotalPages={initialTotalPages}
        onSelectContacts={handleSelectContacts}
      />

      {showMergeDialog && (
        <MergeContactsDialog
          selectedContacts={selectedContacts}
          workspaceId={workspaceId}
          onMergeComplete={() => {
            setShowMergeDialog(false);
            setSelectedContacts([]);
          }}
        />
      )}
    </>
  );
}

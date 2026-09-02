'use client';

import { type Contact } from './contact';
import ImportContactsButton from './import-contacts-button';
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
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  return (
    <>
      <div className="mb-4 flex gap-2">
        <AddContactForm />
        <ImportContactsButton workspaceId={workspaceId} />
      </div>

      <ContactsTable
        initialData={initialData}
        initialTotalPages={initialTotalPages}
      />
    </>
  );
}

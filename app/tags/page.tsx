import Sidebar from "@/components/sidebar";
import TagsManager from "./tags-manager";

export default function TagsPage() {
  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0 min-h-screen flex flex-col items-center pt-16 md:pt-8">
          <h1 className="font-heading text-2xl md:text-3xl text-center text-white mb-6">Tags Manager</h1>
          <TagsManager />
        </div>
      </div>
    </div>
  )
}

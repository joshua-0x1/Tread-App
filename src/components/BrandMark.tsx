import { ChefHat, Pencil } from 'lucide-react'

export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`relative ${className} shrink-0`}>
      <ChefHat className="w-full h-full text-orange-600 fill-orange-600" strokeWidth={1.5} />
      <Pencil
        className="absolute inset-0 m-auto w-[42%] h-[42%] text-white fill-white"
        strokeWidth={1.5}
      />
    </div>
  )
}

<template>
    <div class="flex flex-col gap-4" aria-hidden="true">
        <UCard variant="subtle" class="card card-hero opacity-35">
            <div class="flex flex-col gap-3.5">
                <USkeleton role="presentation" class="h-3.5 w-[45%] rounded-full bg-white/50 motion-reduce:animate-none" />
                <USkeleton role="presentation" class="h-11 w-[70%] rounded-full bg-white/50 motion-reduce:animate-none" />
                <USkeleton role="presentation" class="h-6.5 w-1/2 rounded-full bg-white/35 motion-reduce:animate-none" />
                <USkeleton role="presentation" class="h-12 w-full rounded-full bg-white/50 motion-reduce:animate-none" />
            </div>
        </UCard>

        <UCard variant="subtle" class="card card-flush">
            <div class="grid grid-cols-2 lg:grid-cols-4">
                <div v-for="width in ['w-4/5', 'w-[65%]', 'w-3/4', 'w-[55%]']" :key="width" class="flex flex-col gap-2 p-4.5">
                    <USkeleton role="presentation" class="h-3 w-[60%] rounded-full motion-reduce:animate-none" />
                    <USkeleton role="presentation" class="h-5.5 rounded-full motion-reduce:animate-none" :class="width" />
                </div>
            </div>
        </UCard>

        <UCard variant="subtle" class="card">
            <div class="flex flex-col gap-3.5">
                <USkeleton role="presentation" class="h-4 w-[55%] rounded-full motion-reduce:animate-none" />
                <USkeleton role="presentation" class="h-3 w-full rounded-full motion-reduce:animate-none" />
                <div v-for="width in ['max-w-[55%]', 'max-w-[40%]', 'max-w-[50%]']" :key="width" class="flex items-center gap-3">
                    <USkeleton role="presentation" class="size-9 rounded-full motion-reduce:animate-none" />
                    <USkeleton role="presentation" class="h-3 flex-1 rounded-full motion-reduce:animate-none" :class="width" />
                    <USkeleton role="presentation" class="ml-auto h-3 w-15 rounded-full motion-reduce:animate-none" />
                </div>
            </div>
        </UCard>
    </div>
</template>

import { GuidanceStepShell } from "@/components/guidance/steps/GuidanceStepShell";
import type { GuidanceJourneySidebarStep } from "@/lib/guidance/journey/types";
export function FutureStepV2({stepId,title,description,sidebarSteps,completionPercentage}:{stepId:number;title:string;description:string;sidebarSteps:readonly GuidanceJourneySidebarStep[];completionPercentage:number}){
 return <GuidanceStepShell stepId={stepId} stepCount={18} title={title} description={description} sidebarSteps={sidebarSteps} completionPercentage={completionPercentage}><div className="gpj-card"><h2 className="gpj-card__title">این مرحله در فاز بعدی فعال می‌شود</h2><p className="gpj-card__desc">سه مرحله نخست پرونده در این Patch عملیاتی شده‌اند. این صفحه عمداً فقط جایگاه مرحله را نگه می‌دارد تا ادامه Journey بدون تغییر دوباره معماری ساخته شود.</p></div></GuidanceStepShell>;
}

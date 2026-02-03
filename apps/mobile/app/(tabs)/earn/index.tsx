import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, RefreshControl, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { TaskCard, EarnTask } from "~/components/earn/TaskCard";
import { useGameContext } from "~/contexts/GameContext";
import { getTasks, completeTask as apiCompleteTask, Task } from "~/lib/api";

// Fallback tasks when API is unavailable
const fallbackTasks: EarnTask[] = [
  {
    id: "1",
    description: "Join Telegram Channel",
    platform: "telegram",
    category: "In-app",
    buttonText: "Join",
    quant: 500,
    completed: false,
    url: "https://t.me/quantumclubinc",
  },
  {
    id: "2",
    description: "Follow X Account",
    platform: "twitter",
    category: "In-app",
    buttonText: "Follow",
    quant: 300,
    completed: false,
    url: "https://x.com/quantumclubinc",
  },
  {
    id: "3",
    description: "Create your QC Wallet",
    platform: "wallet",
    category: "In-app",
    buttonText: "Check",
    quant: 1000,
    completed: false,
  },
  {
    id: "4",
    description: "Invite 5 friends",
    platform: "referral",
    category: "In-app",
    buttonText: "Check",
    quant: 2500,
    completed: false,
  },
  {
    id: "5",
    description: "Invite 10 friends",
    platform: "referral",
    category: "In-app",
    buttonText: "Check",
    quant: 5000,
    completed: false,
  },
  {
    id: "6",
    description: "Explore Solve-to-Earn",
    platform: "solve",
    category: "Limited",
    buttonText: "Check",
    quant: 200,
    completed: false,
  },
  {
    id: "7",
    description: "Check TG Channel",
    platform: "telegram",
    category: "Limited",
    buttonText: "Check",
    quant: 100,
    completed: false,
    url: "https://t.me/quantumclubinc",
  },
];

// Convert API Task to EarnTask
function mapApiTaskToEarnTask(task: Task): EarnTask {
  return {
    id: task.id,
    description: task.description,
    platform: task.platform,
    category: task.category,
    buttonText: task.buttonText,
    quant: task.quant,
    completed: task.completed,
    url: task.url,
  };
}

export default function EarnScreen() {
  const { setMainQuantAmount, telegramId, mainQuantAmount } = useGameContext();
  const [activeTab, setActiveTab] = useState("In-app");
  const [tasks, setTasks] = useState<EarnTask[]>(fallbackTasks);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    if (!telegramId) {
      setLoading(false);
      return;
    }

    try {
      const result = await getTasks(telegramId);
      if (result.success && result.data) {
        setTasks(result.data.map(mapApiTaskToEarnTask));
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      // Keep fallback tasks on error
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const handleTaskPress = async (task: EarnTask) => {
    if (task.completed) return;

    setActiveTaskId(task.id);

    try {
      // If task has a URL, open it
      if (task.url && task.buttonText !== "Claim") {
        await Linking.openURL(task.url);
        
        // Update button text to Claim after opening URL
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, buttonText: "Claim" } : t
          )
        );
      } else if (task.buttonText === "Claim" || task.buttonText === "Check") {
        // Call backend to verify and complete task
        if (telegramId) {
          const result = await apiCompleteTask(task.id, telegramId);
          if (result.success && result.data?.success) {
            // Mark as completed
            setTasks((prev) =>
              prev.map((t) =>
                t.id === task.id ? { ...t, completed: true } : t
              )
            );
            // Update QNTM balance
            const currentBalance = parseFloat(mainQuantAmount) || 0;
            setMainQuantAmount((currentBalance + task.quant).toString());
          }
        } else {
          // Fallback: just mark as completed locally
          setTasks((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, completed: true } : t
            )
          );
        }
      }
    } catch (error) {
      console.error("Error handling task:", error);
    } finally {
      setActiveTaskId(null);
    }
  };

  const filteredTasks = tasks.filter((task) => task.category === activeTab);
  const completedCount = tasks.filter((t) => t.completed).length;

  const renderTaskList = (taskList: EarnTask[]) => (
    <View className="px-4 gap-3">
      {loading ? (
        <>
          <Skeleton height={76} className="rounded-xl" />
          <Skeleton height={76} className="rounded-xl" />
          <Skeleton height={76} className="rounded-xl" />
        </>
      ) : taskList.length > 0 ? (
        taskList.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={handleTaskPress}
            isLoading={activeTaskId === task.id}
          />
        ))
      ) : (
        <View className="items-center justify-center py-12">
          <Text className="text-4xl mb-4">🙂</Text>
          <Text style={styles.emptyTitle}>No tasks available</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for new opportunities
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text style={styles.header}>Earn</Text>
        <Text style={styles.subheader}>
          {completedCount} / {tasks.length} tasks completed
        </Text>
      </View>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <View className="px-4 mb-4">
          <TabsList className="bg-[#1a1a1a] border border-[#333]">
            <TabsTrigger value="Limited">
              <Text>Limited</Text>
            </TabsTrigger>
            <TabsTrigger value="In-app">
              <Text>In-app</Text>
            </TabsTrigger>
            <TabsTrigger value="Partners">
              <Text>Partners</Text>
            </TabsTrigger>
          </TabsList>
        </View>

        <ScrollView
          className="flex-1 bg-black"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#fff"
              colors={["#fff"]}
            />
          }
        >
          <TabsContent value="Limited">
            {renderTaskList(filteredTasks)}
          </TabsContent>
          <TabsContent value="In-app">
            {renderTaskList(filteredTasks)}
          </TabsContent>
          <TabsContent value="Partners">
            {renderTaskList(filteredTasks)}
          </TabsContent>
        </ScrollView>
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontFamily: "Onest_700Bold",
    color: "#fff",
  },
  subheader: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#9ca3af",
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Onest_500Medium",
    color: "#9ca3af",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Onest_400Regular",
    color: "#6b7280",
    marginTop: 4,
  },
});
